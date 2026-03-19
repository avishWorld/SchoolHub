import {
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  resetRateLimiter,
  MAX_ATTEMPTS,
  LOCKOUT_DURATION_MS,
} from "../rate-limit";

beforeEach(() => {
  resetRateLimiter();
});

afterAll(() => {
  resetRateLimiter();
});

describe("rate-limit", () => {
  describe("checkRateLimit", () => {
    it("allows first request from unknown IP", () => {
      const result = checkRateLimit("1.2.3.4");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(MAX_ATTEMPTS);
      expect(result.lockedUntil).toBeNull();
    });

    it("allows request after some failed attempts", () => {
      recordFailedAttempt("1.2.3.4");
      recordFailedAttempt("1.2.3.4");
      const result = checkRateLimit("1.2.3.4");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(MAX_ATTEMPTS - 2);
    });

    it("blocks request after lockout triggered", () => {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        recordFailedAttempt("1.2.3.4");
      }
      const result = checkRateLimit("1.2.3.4");
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.lockedUntil).not.toBeNull();
    });

    it("different IPs are independent", () => {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        recordFailedAttempt("1.2.3.4");
      }
      const result = checkRateLimit("5.6.7.8");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(MAX_ATTEMPTS);
    });
  });

  describe("recordFailedAttempt", () => {
    it("returns remaining attempts after first failure", () => {
      const result = recordFailedAttempt("1.2.3.4");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(MAX_ATTEMPTS - 1);
    });

    it("triggers lockout on MAX_ATTEMPTS-th failure", () => {
      let result;
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        result = recordFailedAttempt("1.2.3.4");
      }
      expect(result!.allowed).toBe(false);
      expect(result!.remaining).toBe(0);
      expect(result!.lockedUntil).not.toBeNull();
    });

    it("lockout has correct duration", () => {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        recordFailedAttempt("1.2.3.4");
      }
      const result = checkRateLimit("1.2.3.4");
      const lockedUntil = new Date(result.lockedUntil!).getTime();
      const expectedEnd = Date.now() + LOCKOUT_DURATION_MS;
      // Allow 1 second tolerance
      expect(Math.abs(lockedUntil - expectedEnd)).toBeLessThan(1000);
    });
  });

  describe("clearRateLimit", () => {
    it("resets attempts for an IP", () => {
      recordFailedAttempt("1.2.3.4");
      recordFailedAttempt("1.2.3.4");
      clearRateLimit("1.2.3.4");
      const result = checkRateLimit("1.2.3.4");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(MAX_ATTEMPTS);
    });

    it("clears lockout for an IP", () => {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        recordFailedAttempt("1.2.3.4");
      }
      clearRateLimit("1.2.3.4");
      const result = checkRateLimit("1.2.3.4");
      expect(result.allowed).toBe(true);
    });
  });

  describe("lockout expiry", () => {
    it("unlocks after lockout duration expires", () => {
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        recordFailedAttempt("1.2.3.4");
      }

      // Fast-forward past lockout
      vi.useFakeTimers();
      vi.advanceTimersByTime(LOCKOUT_DURATION_MS + 1000);

      const result = checkRateLimit("1.2.3.4");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(MAX_ATTEMPTS);

      vi.useRealTimers();
    });
  });
});
