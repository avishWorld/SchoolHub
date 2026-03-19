import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

/**
 * POST /api/auth/logout
 *
 * Deletes the session cookie.
 * Always returns 200 (even if no session existed).
 */
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
