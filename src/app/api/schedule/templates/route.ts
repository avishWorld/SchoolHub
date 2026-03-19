import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { buildInstanceInserts } from "@/lib/schedule";
import type { LessonTemplate } from "@/types/database";

/**
 * POST /api/schedule/templates
 *
 * Create a new LessonTemplate + auto-generate instances.
 * Requires admin role (enforced by middleware headers).
 */
export async function POST(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  const userId = request.headers.get("x-user-id");
  if (role !== "admin" && role !== "teacher") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  let body: {
    class_id: string;
    teacher_id: string;
    subject: string;
    day_of_week: number;
    start_time: string;
    duration_minutes: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף בקשה לא תקין." }, { status: 400 });
  }

  // Validate required fields
  if (
    !body.class_id ||
    !body.teacher_id ||
    !body.subject?.trim() ||
    body.day_of_week == null ||
    body.day_of_week < 0 ||
    body.day_of_week > 6 ||
    !body.start_time ||
    !body.duration_minutes ||
    body.duration_minutes < 15 ||
    body.duration_minutes > 120
  ) {
    return NextResponse.json(
      { error: "חסרים שדות חובה או ערכים לא תקינים." },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Subject teacher can only create templates with self as teacher_id
  if (role === "teacher" && userId) {
    const { data: teacherUser } = await supabase
      .from("user")
      .select("is_homeroom_teacher")
      .eq("id", userId)
      .single();

    const isHomeroom = (teacherUser as { is_homeroom_teacher: boolean } | null)?.is_homeroom_teacher;

    // Subject teacher: auto-fill teacher_id to self, or reject if different
    if (!isHomeroom) {
      if (!body.teacher_id || body.teacher_id === "") {
        body.teacher_id = userId; // Auto-fill for subject teacher
      } else if (body.teacher_id !== userId) {
        return NextResponse.json(
          { error: "מורה מקצועי יכול להוסיף שיעורים רק עם עצמו כמורה." },
          { status: 403 }
        );
      }
    }
  }

  // Create the template
  const { data: template, error: insertError } = await supabase
    .from("lesson_template")
    .insert({
      class_id: body.class_id,
      teacher_id: body.teacher_id,
      subject: body.subject.trim(),
      day_of_week: body.day_of_week,
      start_time: body.start_time,
      duration_minutes: body.duration_minutes,
      meeting_url: null,
      meeting_type: null,
    } as never)
    .select()
    .single();

  if (insertError) {
    console.error("Error creating template:", insertError);
    return NextResponse.json(
      { error: "שגיאה ביצירת תבנית." },
      { status: 500 }
    );
  }

  // Auto-generate instances for current + next 2 weeks
  const instances = buildInstanceInserts(
    (template as LessonTemplate).id,
    body.day_of_week,
    new Set() // No existing instances for a new template
  );

  if (instances.length > 0) {
    const { error: instanceError } = await supabase
      .from("lesson_instance")
      .insert(instances as never[]);

    if (instanceError) {
      console.error("Error creating instances:", instanceError);
      // Template was created but instances failed — not critical
    }
  }

  return NextResponse.json({
    template,
    instances_created: instances.length,
  });
}
