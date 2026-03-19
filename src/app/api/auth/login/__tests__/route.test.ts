import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { POST } from "../route";
import { resetRateLimiter } from "@/lib/rate-limit";

// bcrypt is CPU-intensive — increase timeout for CI/parallel runs
vi.setConfig({ testTimeout: 30000 });

// Mock Supabase
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase", () => ({
  createServerClient: () => ({
    from: mockFrom,
  }),
}));

// Mock session — createSessionToken returns a fake token (async)
vi.mock("@/lib/session", () => ({
  createSessionToken: async () => "mock-session-token",
  SESSION_COOKIE_NAME: "schoolhub_session",
  SESSION_DURATION_MS: 7 * 24 * 60 * 60 * 1000,
}));

// Test data
const TEST_PIN = "123456";
let TEST_PIN_HASH: string;

const TEST_USER = {
  id: "user-001",
  school_id: "school-001",
  name: "Test Student",
  role: "student",
  pin: "", // Set in beforeAll
  is_active: true,
};

function createRequest(body: unknown, ip = "127.0.0.1"): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  TEST_PIN_HASH = await bcrypt.hash(TEST_PIN, 12);
  TEST_USER.pin = TEST_PIN_HASH;
});

beforeEach(() => {
  resetRateLimiter();
  mockFrom.mockClear();
  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockResolvedValue({ data: [TEST_USER], error: null });
});

describe("POST /api/auth/login", () => {
  describe("successful login", () => {
    it("returns 200 with user data on valid PIN", async () => {
      const req = createRequest({ pin: TEST_PIN });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.user).toEqual({
        id: "user-001",
        name: "Test Student",
        role: "student",
      });
    });

    it("sets session cookie on response", async () => {
      const req = createRequest({ pin: TEST_PIN });
      const res = await POST(req);

      // Cookie should be set on the response
      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).not.toBeNull();
      expect(setCookie).toContain("schoolhub_session=");
      expect(setCookie).toContain("HttpOnly");
      expect(setCookie).toContain("Path=/");
    });

    it("queries only active users", async () => {
      const req = createRequest({ pin: TEST_PIN });
      await POST(req);

      expect(mockFrom).toHaveBeenCalledWith("user");
      expect(mockSelect).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith("is_active", true);
    });
  });

  describe("validation errors", () => {
    it("returns 400 for missing PIN", async () => {
      const req = createRequest({});
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for non-string PIN", async () => {
      const req = createRequest({ pin: 123456 });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for PIN shorter than 6 digits", async () => {
      const req = createRequest({ pin: "12345" });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for PIN with non-digit characters", async () => {
      const req = createRequest({ pin: "12345a" });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid JSON body", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "127.0.0.1",
        },
        body: "not-json",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe("authentication failures", () => {
    it("returns 401 for wrong PIN", async () => {
      const req = createRequest({ pin: "999999" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.remaining_attempts).toBeDefined();
    });

    it("does not set session cookie on failure", async () => {
      const req = createRequest({ pin: "999999" });
      const res = await POST(req);

      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toBeNull();
    });

    it("returns remaining attempts count", async () => {
      const req = createRequest({ pin: "999999" });
      const res = await POST(req);
      const json = await res.json();

      expect(json.remaining_attempts).toBe(4); // 5 max - 1 failed
    });
  });

  describe("rate limiting", () => {
    it("returns 429 after 5 failed attempts", async () => {
      for (let i = 0; i < 5; i++) {
        const req = createRequest({ pin: "999999" }, "10.0.0.1");
        await POST(req);
      }

      const req = createRequest({ pin: "999999" }, "10.0.0.1");
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(429);
      expect(json.locked_until).toBeDefined();
    });

    it("5th failed attempt itself triggers lockout", async () => {
      let res;
      for (let i = 0; i < 5; i++) {
        const req = createRequest({ pin: "999999" }, "10.0.0.2");
        res = await POST(req);
      }

      // The 5th attempt should return 429
      expect(res!.status).toBe(429);
    });

    it("blocks even valid PIN during lockout", async () => {
      // Trigger lockout
      for (let i = 0; i < 5; i++) {
        const req = createRequest({ pin: "999999" }, "10.0.0.3");
        await POST(req);
      }

      // Try valid PIN from same IP
      const req = createRequest({ pin: TEST_PIN }, "10.0.0.3");
      const res = await POST(req);

      expect(res.status).toBe(429);
    });

    it("different IPs have independent rate limits", async () => {
      // Lock out IP1
      for (let i = 0; i < 5; i++) {
        const req = createRequest({ pin: "999999" }, "10.0.0.4");
        await POST(req);
      }

      // IP2 should still work
      const req = createRequest({ pin: TEST_PIN }, "10.0.0.5");
      const res = await POST(req);

      expect(res.status).toBe(200);
    });

    it("successful login clears rate limit", async () => {
      // 3 failed attempts
      for (let i = 0; i < 3; i++) {
        const req = createRequest({ pin: "999999" }, "10.0.0.6");
        await POST(req);
      }

      // Successful login
      const req = createRequest({ pin: TEST_PIN }, "10.0.0.6");
      const res = await POST(req);
      expect(res.status).toBe(200);

      // Next failed attempt should start fresh
      const failReq = createRequest({ pin: "999999" }, "10.0.0.6");
      const failRes = await POST(failReq);
      const json = await failRes.json();

      expect(json.remaining_attempts).toBe(4); // Reset to 5-1=4
    });
  });

  describe("database errors", () => {
    it("returns 500 on database error", async () => {
      mockEq.mockResolvedValueOnce({
        data: null,
        error: { message: "Connection failed" },
      });

      const req = createRequest({ pin: TEST_PIN });
      const res = await POST(req);

      expect(res.status).toBe(500);
    });
  });

  describe("multi-device support", () => {
    it("same PIN can login from multiple IPs", async () => {
      const req1 = createRequest({ pin: TEST_PIN }, "10.0.0.10");
      const res1 = await POST(req1);
      expect(res1.status).toBe(200);

      const req2 = createRequest({ pin: TEST_PIN }, "10.0.0.11");
      const res2 = await POST(req2);
      expect(res2.status).toBe(200);
    });
  });
});
