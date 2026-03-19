import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { Invitation, Class } from "@/types/database";

/**
 * GET /api/enrollment/invite/:token
 *
 * Public endpoint — validates token, returns class info (without exposing class name in OG tags).
 * Used by the /join/[token] page to check if the invite is valid.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabase = createServerClient();

  const { data: invitation, error } = await supabase
    .from("invitation")
    .select()
    .eq("token", params.token)
    .eq("is_active", true)
    .single();

  if (error || !invitation) {
    return NextResponse.json(
      { error: "קישור הזמנה לא תקין או שפג תוקפו." },
      { status: 410 }
    );
  }

  const inv = invitation as Invitation;

  // Check expiry
  if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "פג תוקף קישור ההזמנה." },
      { status: 410 }
    );
  }

  // Fetch class info (generic — no name in public response for privacy)
  const { data: classData } = await supabase
    .from("class")
    .select()
    .eq("id", inv.class_id)
    .single();

  const cls = classData as Class | null;

  // Get school name
  const { data: schoolData } = await supabase
    .from("school")
    .select("name")
    .eq("id", inv.school_id)
    .single();

  // Get homeroom teacher name for this class
  let homeroomTeacherName: string | null = null;
  const { data: homeroomTeachers } = await supabase
    .from("user")
    .select("id, name")
    .eq("role", "teacher")
    .eq("is_homeroom_teacher", true)
    .eq("school_id", inv.school_id);

  // Find homeroom teacher who has templates for this class
  if (homeroomTeachers && cls) {
    const { data: classTemplates } = await supabase
      .from("lesson_template")
      .select("teacher_id")
      .eq("class_id", inv.class_id);

    const teacherIds = new Set(
      ((classTemplates as { teacher_id: string }[]) || []).map((t) => t.teacher_id)
    );
    const homeroom = (homeroomTeachers as { id: string; name: string }[])
      .find((t) => teacherIds.has(t.id));
    homeroomTeacherName = homeroom?.name || null;
  }

  return NextResponse.json({
    valid: true,
    invitation_id: inv.id,
    class_id: inv.class_id,
    school_id: inv.school_id,
    class_name: cls?.name || null,
    grade: cls?.grade || null,
    school_name: (schoolData as { name: string } | null)?.name || null,
    homeroom_teacher: homeroomTeacherName,
  });
}

/**
 * DELETE /api/enrollment/invite/:token
 *
 * Revoke an invitation link.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const role = request.headers.get("x-user-role");
  if (role !== "teacher" && role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from("invitation")
    .update({ is_active: false } as never)
    .eq("token", params.token);

  if (error) {
    return NextResponse.json({ error: "שגיאה בביטול הזמנה." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
