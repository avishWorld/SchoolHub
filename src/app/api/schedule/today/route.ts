import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { formatDate } from "@/lib/schedule";
import type { LessonInstance, LessonTemplate, Student, User } from "@/types/database";

/**
 * GET /api/schedule/today
 *
 * Returns today's lesson instances for the logged-in student's class.
 * Includes template data (subject, teacher, time) and meeting_url
 * with fallback from template if instance URL is null.
 *
 * Query params:
 *   ?class_id=xxx  — override class (used by parent viewing child's schedule)
 *   ?date=YYYY-MM-DD — override date (for testing/preview)
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role");

  if (!userId) {
    return NextResponse.json({ error: "לא מחובר." }, { status: 401 });
  }

  const supabase = createServerClient();

  // Determine class_id
  let classId = request.nextUrl.searchParams.get("class_id");

  if (!classId) {
    if (role === "student") {
      // Look up student's class
      const { data: student } = await supabase
        .from("student")
        .select()
        .eq("user_id", userId)
        .single();

      if (!student) {
        return NextResponse.json(
          { error: "לא נמצאה כיתה עבור התלמיד." },
          { status: 404 }
        );
      }
      classId = (student as Student).class_id;
    } else {
      return NextResponse.json(
        { error: "חסר מזהה כיתה." },
        { status: 400 }
      );
    }
  }

  // Determine date
  const dateParam = request.nextUrl.searchParams.get("date");
  const today = dateParam || formatDate(new Date());

  // Fetch today's instances for this class, joined with template data
  // Supabase doesn't support deep joins on views, so we do 2 queries
  const { data: instances, error: instanceError } = await supabase
    .from("lesson_instance")
    .select("*, lesson_template!inner(*)")
    .eq("lesson_template.class_id", classId)
    .eq("date", today)
    .order("lesson_template(start_time)");

  if (instanceError) {
    console.error("Error fetching schedule:", instanceError);

    // Fallback: fetch instances via templates
    const { data: templates } = await supabase
      .from("lesson_template")
      .select()
      .eq("class_id", classId);

    if (!templates || templates.length === 0) {
      return NextResponse.json({ lessons: [], date: today });
    }

    const templateIds = (templates as LessonTemplate[]).map((t) => t.id);
    const { data: fallbackInstances } = await supabase
      .from("lesson_instance")
      .select()
      .in("template_id", templateIds)
      .eq("date", today);

    const templateMap = new Map(
      (templates as LessonTemplate[]).map((t) => [t.id, t])
    );

    // Fetch teacher names
    const teacherIds = Array.from(new Set((templates as LessonTemplate[]).map((t) => t.teacher_id)));
    const { data: teacherData } = await supabase
      .from("user")
      .select("id, name")
      .in("id", teacherIds);
    const teacherMap = new Map(
      (teacherData as Pick<User, "id" | "name">[] || []).map((t) => [t.id, t.name])
    );

    const lessons = ((fallbackInstances as LessonInstance[]) || []).map((inst) => {
      const tmpl = templateMap.get(inst.template_id);
      return {
        id: inst.id,
        template_id: inst.template_id,
        date: inst.date,
        subject: tmpl?.subject || "—",
        teacher_name: tmpl ? (teacherMap.get(tmpl.teacher_id) || "—") : "—",
        start_time: tmpl?.start_time || "00:00",
        duration_minutes: tmpl?.duration_minutes || 0,
        meeting_url: inst.meeting_url || tmpl?.meeting_url || null,
        status: inst.status,
        cancelled_reason: inst.cancelled_reason,
        notes: inst.notes || null,
        resources: inst.resources || null,
      };
    });

    lessons.sort((a, b) => a.start_time.localeCompare(b.start_time));
    return NextResponse.json({ lessons, date: today });
  }

  // Success path: transform joined data
  type JoinedRow = LessonInstance & {
    lesson_template: LessonTemplate;
  };

  const rows = (instances as JoinedRow[]) || [];

  // Fetch teacher names
  const teacherIds = Array.from(new Set(rows.map((r) => r.lesson_template.teacher_id)));
  let teacherMap = new Map<string, string>();
  if (teacherIds.length > 0) {
    const { data: teacherData } = await supabase
      .from("user")
      .select("id, name")
      .in("id", teacherIds);
    teacherMap = new Map(
      (teacherData as Pick<User, "id" | "name">[] || []).map((t) => [t.id, t.name])
    );
  }

  const lessons = rows.map((row) => ({
    id: row.id,
    template_id: row.template_id,
    date: row.date,
    subject: row.lesson_template.subject,
    teacher_name: teacherMap.get(row.lesson_template.teacher_id) || "—",
    start_time: row.lesson_template.start_time,
    duration_minutes: row.lesson_template.duration_minutes,
    meeting_url: row.meeting_url || row.lesson_template.meeting_url || null,
    status: row.status,
    cancelled_reason: row.cancelled_reason,
    notes: (row as unknown as { notes: string | null }).notes || null,
    resources: (row as unknown as { resources: unknown[] | null }).resources || null,
  }));

  lessons.sort((a, b) => a.start_time.localeCompare(b.start_time));

  return NextResponse.json({ lessons, date: today });
}
