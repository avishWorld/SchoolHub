/**
 * In-memory rate limiter for PIN login attempts.
 *
 * Tracks failed attempts per IP address. After MAX_ATTEMPTS failures
 * within the window, the IP is locked out for LOCKOUT_DURATION_MS.
 *
 * NOTE: This is in-memory and resets on server restart. For production
 * with multiple instances, use Redis or a database-backed rate limiter.
 */

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const attempts = new Map<string, AttemptRecord>();

// Periodic cleanup of expired records
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    attempts.forEach((record, key) => {
      if (record.lockedUntil && now > record.lockedUntil) {
        attempts.delete(key);
      } else if (now - record.firstAttempt > LOCKOUT_DURATION_MS) {
        attempts.delete(key);
      }
    });
    if (attempts.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, CLEANUP_INTERVAL_MS);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  lockedUntil: string | null;
}

/**
 * Check if an IP is currently rate-limited.
 * Returns whether the request is allowed and remaining attempts.
 */
export function checkRateLimit(ip: string): RateLimitResult {
  const record = attempts.get(ip);

  if (!record) {
    return { allowed: true, remaining: MAX_ATTEMPTS, lockedUntil: null };
  }

  // Check if lockout has expired
  if (record.lockedUntil) {
    if (Date.now() >= record.lockedUntil) {
      attempts.delete(ip);
      return { allowed: true, remaining: MAX_ATTEMPTS, lockedUntil: null };
    }
    return {
      allowed: false,
      remaining: 0,
      lockedUntil: new Date(record.lockedUntil).toISOString(),
    };
  }

  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - record.count,
    lockedUntil: null,
  };
}

/**
 * Record a failed login attempt for an IP.
 * If this was the MAX_ATTEMPTS-th failure, triggers lockout.
 */
export function recordFailedAttempt(ip: string): RateLimitResult {
  startCleanup();

  const record = attempts.get(ip);

  if (!record) {
    attempts.set(ip, {
      count: 1,
      firstAttempt: Date.now(),
      lockedUntil: null,
    });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, lockedUntil: null };
  }

  record.count += 1;

  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    return {
      allowed: false,
      remaining: 0,
      lockedUntil: new Date(record.lockedUntil).toISOString(),
    };
  }

  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - record.count,
    lockedUntil: null,
  };
}

/**
 * Clear rate limit record for an IP (on successful login).
 */
export function clearRateLimit(ip: string): void {
  attempts.delete(ip);
}

/**
 * Reset all rate limit state. Used in tests.
 */
export function resetRateLimiter(): void {
  attempts.clear();
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

// Export for testing
export { MAX_ATTEMPTS, LOCKOUT_DURATION_MS };
