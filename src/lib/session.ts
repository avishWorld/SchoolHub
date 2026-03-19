/**
 * Session management for PIN-based auth.
 *
 * Uses a signed JSON session token stored in an httpOnly cookie.
 * The token contains: user_id, role, school_id, expires_at.
 *
 * Signing uses Web Crypto API (HMAC-SHA256) which works in BOTH
 * Node.js runtime AND Edge Runtime (Next.js middleware).
 *
 * Session duration: 7 days.
 */

import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "schoolhub_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionPayload {
  user_id: string;
  role: string;
  school_id: string;
  name: string;
  expires_at: number;
}

function getSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return secret;
}

// Unicode-safe base64 encode/decode (works with Hebrew text)
function toBase64(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

function fromBase64(b64: string): string {
  return decodeURIComponent(
    atob(b64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
}

/**
 * HMAC-SHA256 sign using Web Crypto API.
 * Works in both Node.js (18+) and Edge Runtime.
 */
async function sign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await globalThis.crypto.subtle.sign("HMAC", key, enc.encode(payload));
  // Convert ArrayBuffer to base64url string
  const bytes = new Uint8Array(sig);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Create a signed session token.
 */
export async function createSessionToken(
  data: Omit<SessionPayload, "expires_at">
): Promise<string> {
  const payload: SessionPayload = {
    ...data,
    expires_at: Date.now() + SESSION_DURATION_MS,
  };
  const encoded = toBase64(JSON.stringify(payload));
  const signature = await sign(encoded, getSecret());
  return `${encoded}.${signature}`;
}

/**
 * Verify and decode a session token.
 * Returns null if invalid or expired.
 */
export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const dotIndex = token.lastIndexOf(".");
    if (dotIndex === -1) return null;

    const encoded = token.slice(0, dotIndex);
    const signature = token.slice(dotIndex + 1);
    if (!encoded || !signature) return null;

    const expectedSig = await sign(encoded, getSecret());
    if (signature !== expectedSig) return null;

    const payload: SessionPayload = JSON.parse(fromBase64(encoded));
    if (payload.expires_at < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Set the session cookie after successful login.
 */
export async function setSessionCookie(
  data: Omit<SessionPayload, "expires_at">
): Promise<void> {
  const token = await createSessionToken(data);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

/**
 * Get the current session from the cookie.
 * Returns null if no session or session is invalid/expired.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!cookie?.value) return null;
  return verifySessionToken(cookie.value);
}

/**
 * Delete the session cookie (logout).
 */
export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export { SESSION_COOKIE_NAME, SESSION_DURATION_MS };
