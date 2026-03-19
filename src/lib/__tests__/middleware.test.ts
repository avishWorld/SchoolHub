/**
 * Tests for auth middleware logic.
 *
 * We test the middleware indirectly by testing the underlying session
 * verification and route matching logic, since the middleware itself
 * depends on Next.js runtime internals that are hard to mock.
 */
import { verifySessionToken, createSessionToken } from "../session";

beforeAll(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-secret-key-for-middleware-tests";
});

const validData = {
  user_id: "user-123",
  role: "admin",
  school_id: "school-456",
  name: "Test Admin",
};

describe("middleware session verification", () => {
  it("accepts a valid session token", async () => {
    const token = await createSessionToken(validData);
    const payload = await verifySessionToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.role).toBe("admin");
  });

  it("rejects an expired session", async () => {
    const token = await createSessionToken(validData);
    vi.useFakeTimers();
    vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000); // 8 days
    const payload = await verifySessionToken(token);
    expect(payload).toBeNull();
    vi.useRealTimers();
  });

  it("rejects a tampered token", async () => {
    const token = await createSessionToken(validData);
    const dotIndex = token.lastIndexOf(".");
    const payload = token.slice(0, dotIndex);
    const result = await verifySessionToken(`${payload}.tampered`);
    expect(result).toBeNull();
  });

  it("preserves role information for route matching", async () => {
    const studentToken = await createSessionToken({
      ...validData,
      role: "student",
    });
    const payload = await verifySessionToken(studentToken);
    expect(payload!.role).toBe("student");
  });

  it("preserves school_id for data scoping", async () => {
    const token = await createSessionToken(validData);
    const payload = await verifySessionToken(token);
    expect(payload!.school_id).toBe("school-456");
  });
});
