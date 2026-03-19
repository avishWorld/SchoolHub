import crypto from "crypto";

/**
 * Generate a random 12-character URL-safe token for invite links.
 * Uses crypto.randomBytes for security.
 */
export function generateToken(length = 12): string {
  return crypto.randomBytes(length).toString("base64url").slice(0, length);
}
