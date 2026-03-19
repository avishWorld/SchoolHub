import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServerClient } from "@/lib/supabase";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_DURATION_MS } from "@/lib/session";
import {
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
} from "@/lib/rate-limit";
import type { User } from "@/types/database";

/**
 * POST /api/auth/login
 *
 * Authenticates a user by 6-digit PIN.
 *
 * Request body: { pin: string }
 * Success (200): { user: { id, name, role } }
 * Error (401): { error: string, remaining_attempts: number }
 * Error (429): { error: string, locked_until: string }
 * Error (400): { error: string }
 */
export async function POST(request: NextRequest) {
  // Get client IP for rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Check rate limit before processing
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: "יותר מדי ניסיונות כושלים. נסה שוב מאוחר יותר.",
        locked_until: rateCheck.lockedUntil,
      },
      { status: 429 }
    );
  }

  // Parse and validate request body
  let pin: string;
  try {
    const body = await request.json();
    pin = body.pin;
  } catch {
    return NextResponse.json(
      { error: "גוף הבקשה לא תקין." },
      { status: 400 }
    );
  }

  if (!pin || typeof pin !== "string" || !/^\d{6}$/.test(pin)) {
    return NextResponse.json(
      { error: "קוד PIN חייב להיות בן 6 ספרות." },
      { status: 400 }
    );
  }

  // Query all active users — we need to compare the PIN hash
  // Since PIN is hashed, we can't filter by PIN in SQL.
  // We fetch all active users and compare in-memory.
  // For a single school this is fine (<100 users).
  const supabase = createServerClient();
  const { data: users, error: dbError } = await supabase
    .from("user")
    .select()
    .eq("is_active", true);

  if (dbError) {
    console.error("Database error during login:", dbError);
    return NextResponse.json(
      { error: "שגיאת שרת. נסה שוב מאוחר יותר." },
      { status: 500 }
    );
  }

  // Find user by PIN comparison
  let matchedUser: User | null = null;
  for (const user of (users as User[]) || []) {
    const isMatch = await bcrypt.compare(pin, user.pin);
    if (isMatch) {
      matchedUser = user;
      break;
    }
  }

  if (!matchedUser) {
    const result = recordFailedAttempt(ip);
    if (!result.allowed) {
      return NextResponse.json(
        {
          error: "יותר מדי ניסיונות כושלים. נסה שוב בעוד 5 דקות.",
          locked_until: result.lockedUntil,
        },
        { status: 429 }
      );
    }
    return NextResponse.json(
      {
        error: "קוד PIN שגוי.",
        remaining_attempts: result.remaining,
      },
      { status: 401 }
    );
  }

  // Successful login — clear rate limit and set session cookie
  clearRateLimit(ip);

  const sessionToken = await createSessionToken({
    user_id: matchedUser.id,
    role: matchedUser.role,
    school_id: matchedUser.school_id,
    name: matchedUser.name,
  });

  // Build response and set cookie DIRECTLY on the response object.
  // Using cookies() from next/headers doesn't attach to NextResponse.json().
  const response = NextResponse.json({
    user: {
      id: matchedUser.id,
      name: matchedUser.name,
      role: matchedUser.role,
    },
  });

  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });

  return response;
}
