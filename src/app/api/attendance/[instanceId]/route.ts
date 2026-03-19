import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { Attendance, Student } from "@/types/database";

/**
 * POST /api/attendance/:instanceId
 *
 * Record student's join intent (join_clicked_at).
 * Creates an Attendance record if one doesn't exist, or updates join_clicked_at.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { instanceId: string } }
) {
  const userId = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role");
  if (!userId) {
    return NextResponse.json({ error: "לא מחובר." }, { status: 401 });
  }

  const supabase = createServerClient();

  // Find student_id from user_id
  let studentId: string;
  if (role === "student") {
    const { data: student } = await supabase
      .from("student")
      .select("id")
      .eq("user_id", userId)
      .single();
    if (!student) {
      return NextResponse.json({ error: "תלמיד לא נמצא." }, { status: 404 });
    }
    studentId = (student as Pick<Student, "id">).id;
  } else {
    // Parent clicking for child — student_id in body
    try {
      const body = await request.json();
      studentId = body.student_id;
    } catch {
      return NextResponse.json({ error: "חסר מזהה תלמיד." }, { status: 400 });
    }
  }

  if (!studentId) {
    return NextResponse.json({ error: "חסר מזהה תלמיד." }, { status: 400 });
  }

  // Check if attendance record already exists
  const { data: existing } = await supabase
    .from("attendance")
    .select("id")
    .eq("lesson_instance_id", params.instanceId)
    .eq("student_id", studentId)
    .single();

  const now = new Date().toISOString();

  if (existing) {
    // Update existing — record new join click
    await supabase
      .from("attendance")
      .update({ join_clicked_at: now } as never)
      .eq("id", (existing as { id: string }).id);

    return NextResponse.json({ attendance_id: (existing as { id: string }).id, join_clicked_at: now });
  }

  // Create new attendance record
  const { data, error } = await supabase
    .from("attendance")
    .insert({
      lesson_instance_id: params.instanceId,
      student_id: studentId,
      join_clicked_at: now,
    } as never)
    .select("id")
    .single();

  if (error) {
    console.error("Error recording attendance:", error);
    return NextResponse.json({ error: "שגיאה ברישום נוכחות." }, { status: 500 });
  }

  return NextResponse.json({ attendance_id: (data as { id: string }).id, join_clicked_at: now });
}

/**
 * GET /api/attendance/:instanceId
 *
 * Get attendance list for a lesson instance.
 * Returns all students in the class with their attendance status.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { instanceId: string } }
) {
  const role = request.headers.get("x-user-role");
  if (role !== "teacher" && role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  const supabase = createServerClient();

  // Get the instance to find the class
  const { data: instance } = await supabase
    .from("lesson_instance")
    .select("id, template_id")
    .eq("id", params.instanceId)
    .single();

  if (!instance) {
    return NextResponse.json({ error: "שיעור לא נמצא." }, { status: 404 });
  }

  const { data: template } = await supabase
    .from("lesson_template")
    .select("class_id")
    .eq("id", (instance as { template_id: string }).template_id)
    .single();

  if (!template) {
    return NextResponse.json({ error: "תבנית לא נמצאה." }, { status: 404 });
  }

  const classId = (template as { class_id: string }).class_id;

  // Get all students in this class
  const { data: students } = await supabase
    .from("student")
    .select("id, user_id")
    .eq("class_id", classId);

  if (!students || students.length === 0) {
    return NextResponse.json({ attendance: [] });
  }

  const studentList = students as Pick<Student, "id" | "user_id">[];
  const userIds = studentList.map((s) => s.user_id);

  // Get student names
  const { data: users } = await supabase
    .from("user")
    .select("id, name")
    .in("id", userIds);

  const nameMap = new Map(
    ((users as { id: string; name: string }[]) || []).map((u) => [u.id, u.name])
  );

  // Get attendance records for this instance
  const studentIds = studentList.map((s) => s.id);
  const { data: records } = await supabase
    .from("attendance")
    .select()
    .eq("lesson_instance_id", params.instanceId)
    .in("student_id", studentIds);

  const attendanceMap = new Map(
    ((records as Attendance[]) || []).map((a) => [a.student_id, a])
  );

  // Build response
  const attendance = studentList.map((s) => {
    const record = attendanceMap.get(s.id);
    return {
      student_id: s.id,
      student_name: nameMap.get(s.user_id) || "—",
      attendance_id: record?.id || null,
      join_clicked_at: record?.join_clicked_at || null,
      status: record?.status || "unknown",
      confirmed_by: record?.confirmed_by || null,
    };
  });

  return NextResponse.json({ attendance });
}
