import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { generateToken } from "@/lib/token";
import { logAuditAction } from "@/lib/audit";
import type { Invitation } from "@/types/database";

/**
 * POST /api/enrollment/invite
 *
 * Create an invitation link for a class.
 * Deactivates any existing active link for that class first.
 * Body: { class_id: string, expires_days?: number }
 */
export async function POST(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  const userId = request.headers.get("x-user-id");
  const schoolId = request.headers.get("x-school-id");
  if ((role !== "teacher" && role !== "admin") || !schoolId) {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  let body: { class_id: string; expires_days?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף בקשה לא תקין." }, { status: 400 });
  }

  if (!body.class_id) {
    return NextResponse.json({ error: "חסר מזהה כיתה." }, { status: 400 });
  }

  const supabase = createServerClient();

  // Deactivate existing active invitations for this class
  await supabase
    .from("invitation")
    .update({ is_active: false } as never)
    .eq("class_id", body.class_id)
    .eq("is_active", true);

  // Create new invitation
  const token = generateToken(12);
  const expiresAt = body.expires_days
    ? new Date(Date.now() + body.expires_days * 86400000).toISOString()
    : null;

  const { data, error } = await supabase
    .from("invitation")
    .insert({
      class_id: body.class_id,
      school_id: schoolId,
      token,
      created_by: userId || "",
      expires_at: expiresAt,
    } as never)
    .select()
    .single();

  if (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json({ error: "שגיאה ביצירת הזמנה." }, { status: 500 });
  }

  const invitation = data as Invitation;
  const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/join/${token}`;

  await logAuditAction({
    schoolId, userId: userId || "",
    action: "invitation_created", targetType: "invitation",
    targetId: invitation.id, details: { class_id: body.class_id, token },
  });

  return NextResponse.json({ invitation, join_url: joinUrl });
}

/**
 * GET /api/enrollment/invite
 *
 * List active invitations for the teacher/admin's school.
 */
export async function GET(request: NextRequest) {
  const schoolId = request.headers.get("x-school-id");
  if (!schoolId) {
    return NextResponse.json({ error: "חסר מזהה בית ספר." }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("invitation")
    .select()
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "שגיאת שרת." }, { status: 500 });
  }

  return NextResponse.json({ invitations: data as Invitation[] });
}
