import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

/**
 * PUT /api/attendance/:instanceId/confirm
 *
 * Teacher confirms or overrides attendance status for a student.
 * Body: { student_id: string, status: "present" | "absent" | "late" }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { instanceId: string } }
) {
  const role = request.headers.get("x-user-role");
  const userId = request.headers.get("x-user-id");
  if (role !== "teacher" && role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  let body: { student_id: string; status: "present" | "absent" | "late" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף בקשה לא תקין." }, { status: 400 });
  }

  if (!body.student_id || !body.status) {
    return NextResponse.json({ error: "חסרים שדות." }, { status: 400 });
  }

  const validStatuses = ["present", "absent", "late"];
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json({ error: "סטטוס לא תקין." }, { status: 400 });
  }

  const supabase = createServerClient();
  const now = new Date().toISOString();

  // Check if attendance record exists
  const { data: existing } = await supabase
    .from("attendance")
    .select("id")
    .eq("lesson_instance_id", params.instanceId)
    .eq("student_id", body.student_id)
    .single();

  if (existing) {
    // Update existing record
    const { error } = await supabase
      .from("attendance")
      .update({
        status: body.status,
        confirmed_by: userId,
        confirmed_at: now,
      } as never)
      .eq("id", (existing as { id: string }).id);

    if (error) {
      return NextResponse.json({ error: "שגיאה בעדכון." }, { status: 500 });
    }

    return NextResponse.json({ success: true, attendance_id: (existing as { id: string }).id });
  }

  // Create new record with confirmed status (no join_clicked_at)
  const { data, error } = await supabase
    .from("attendance")
    .insert({
      lesson_instance_id: params.instanceId,
      student_id: body.student_id,
      status: body.status,
      confirmed_by: userId,
      confirmed_at: now,
    } as never)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "שגיאה ביצירת רשומה." }, { status: 500 });
  }

  return NextResponse.json({ success: true, attendance_id: (data as { id: string }).id });
}
