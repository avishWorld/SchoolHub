import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { checkRateLimit, recordFailedAttempt } from "@/lib/rate-limit";
import type { EnrollmentRequest } from "@/types/database";

/**
 * POST /api/enrollment/request
 *
 * Public endpoint — submit enrollment request.
 * Rate limited: uses same rate limiter (different key prefix).
 * Body: { invitation_id, name, role, phone?, email?, children_names? }
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimitKey = `enroll:${ip}`;

  const rateCheck = checkRateLimit(rateLimitKey);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "יותר מדי בקשות. נסה שוב מאוחר יותר." },
      { status: 429 }
    );
  }

  let body: {
    invitation_id: string;
    name: string;
    role: "parent" | "student";
    phone?: string;
    email?: string;
    children_names?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף בקשה לא תקין." }, { status: 400 });
  }

  if (!body.invitation_id || !body.name?.trim() || !body.role) {
    return NextResponse.json({ error: "חסרים שדות חובה." }, { status: 400 });
  }

  if (body.role !== "parent" && body.role !== "student") {
    return NextResponse.json({ error: "תפקיד לא תקין." }, { status: 400 });
  }

  const supabase = createServerClient();

  // Verify invitation exists and is active
  const { data: invitation } = await supabase
    .from("invitation")
    .select("id, is_active, expires_at")
    .eq("id", body.invitation_id)
    .single();

  if (!invitation || !(invitation as { is_active: boolean }).is_active) {
    return NextResponse.json({ error: "הזמנה לא תקינה." }, { status: 410 });
  }

  // Duplicate detection by phone or email
  if (body.phone || body.email) {
    let dupQuery = supabase
      .from("enrollment_request")
      .select("id")
      .eq("invitation_id", body.invitation_id)
      .eq("status", "pending");

    if (body.phone) {
      dupQuery = dupQuery.eq("phone", body.phone);
    }

    const { data: existing } = await dupQuery;
    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "כבר קיימת בקשת הרשמה עם פרטים אלו." },
        { status: 409 }
      );
    }
  }

  // Create enrollment request
  const { data, error } = await supabase
    .from("enrollment_request")
    .insert({
      invitation_id: body.invitation_id,
      name: body.name.trim(),
      role: body.role,
      phone: body.phone || null,
      email: body.email || null,
      children_names: body.children_names || null,
    } as never)
    .select()
    .single();

  if (error) {
    console.error("Error creating enrollment request:", error);
    recordFailedAttempt(rateLimitKey);
    return NextResponse.json({ error: "שגיאה בשליחת הבקשה." }, { status: 500 });
  }

  return NextResponse.json({
    request: data as EnrollmentRequest,
    message: "בקשת ההרשמה נשלחה בהצלחה. המורה יבדוק ויאשר.",
  });
}
