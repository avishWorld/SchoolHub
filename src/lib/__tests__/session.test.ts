import { createSessionToken, verifySessionToken } from "../session";

// Set a test secret
beforeAll(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-secret-key-for-unit-tests";
});

const sampleData = {
  user_id: "user-123",
  role: "student",
  school_id: "school-456",
  name: "Test User",
};

describe("session", () => {
  describe("createSessionToken", () => {
    it("creates a token with payload and signature parts", async () => {
      const token = await createSessionToken(sampleData);
      const dotIndex = token.lastIndexOf(".");
      expect(dotIndex).toBeGreaterThan(0);
      expect(token.slice(0, dotIndex).length).toBeGreaterThan(0);
      expect(token.slice(dotIndex + 1).length).toBeGreaterThan(0);
    });

    it("creates different tokens for different data", async () => {
      const token1 = await createSessionToken(sampleData);
      const token2 = await createSessionToken({ ...sampleData, user_id: "user-789" });
      expect(token1).not.toBe(token2);
    });
  });

  describe("verifySessionToken", () => {
    it("verifies a valid token", async () => {
      const token = await createSessionToken(sampleData);
      const payload = await verifySessionToken(token);
      expect(payload).not.toBeNull();
      expect(payload!.user_id).toBe("user-123");
      expect(payload!.role).toBe("student");
      expect(payload!.school_id).toBe("school-456");
      expect(payload!.name).toBe("Test User");
    });

    it("includes expires_at in the future", async () => {
      const token = await createSessionToken(sampleData);
      const payload = await verifySessionToken(token);
      expect(payload!.expires_at).toBeGreaterThan(Date.now());
    });

    it("returns null for tampered payload", async () => {
      const token = await createSessionToken(sampleData);
      const dotIndex = token.lastIndexOf(".");
      const sig = token.slice(dotIndex + 1);
      const fakePayload = btoa("tampered-data");
      const result = await verifySessionToken(`${fakePayload}.${sig}`);
      expect(result).toBeNull();
    });

    it("returns null for tampered signature", async () => {
      const token = await createSessionToken(sampleData);
      const dotIndex = token.lastIndexOf(".");
      const payload = token.slice(0, dotIndex);
      const result = await verifySessionToken(`${payload}.invalid-signature`);
      expect(result).toBeNull();
    });

    it("returns null for empty string", async () => {
      expect(await verifySessionToken("")).toBeNull();
    });

    it("returns null for garbage input", async () => {
      expect(await verifySessionToken("not-a-token")).toBeNull();
    });

    it("returns null for expired token", async () => {
      const token = await createSessionToken(sampleData);

      vi.useFakeTimers();
      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000); // 8 days

      const result = await verifySessionToken(token);
      expect(result).toBeNull();

      vi.useRealTimers();
    });

    it("handles Hebrew names correctly", async () => {
      const hebrewData = { ...sampleData, name: "מנהלת — שרה" };
      const token = await createSessionToken(hebrewData);
      const payload = await verifySessionToken(token);
      expect(payload).not.toBeNull();
      expect(payload!.name).toBe("מנהלת — שרה");
    });
  });
});
