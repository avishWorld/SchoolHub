import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { formatDate } from "@/lib/schedule";
import type { LessonInstance, LessonTemplate, Student, User } from "@/types/database";

/**
 * GET /api/schedule/week
 *
 * Returns the current week's lesson instances for a class.
 * Query params:
 *   ?class_id=xxx (required for teacher/admin, auto-detected for student)
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role");

  if (!userId) {
    return NextResponse.json({ error: "לא מחובר." }, { status: 401 });
  }

  const supabase = createServerClient();
  let classId = request.nextUrl.searchParams.get("class_id");

  if (!classId && role === "student") {
    const { data: student } = await supabase
      .from("student")
      .select()
      .eq("user_id", userId)
      .single();
    if (!student) {
      return NextResponse.json({ error: "לא נמצאה כיתה." }, { status: 404 });
    }
    classId = (student as Student).class_id;
  }

  if (!classId) {
    return NextResponse.json({ error: "חסר מזהה כיתה." }, { status: 400 });
  }

  // Calculate week range (Sunday to Saturday)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dayOfWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  // Fetch templates for this class
  const { data: templates } = await supabase
    .from("lesson_template")
    .select()
    .eq("class_id", classId);

  if (!templates || templates.length === 0) {
    return NextResponse.json({ lessons: [], week_start: formatDate(weekStart), week_end: formatDate(weekEnd) });
  }

  const tmplList = templates as LessonTemplate[];
  const templateIds = tmplList.map((t) => t.id);
  const templateMap = new Map(tmplList.map((t) => [t.id, t]));

  // Fetch instances for this week
  const { data: instances } = await supabase
    .from("lesson_instance")
    .select()
    .in("template_id", templateIds)
    .gte("date", formatDate(weekStart))
    .lte("date", formatDate(weekEnd));

  // Fetch teacher names
  const teacherIds = Array.from(new Set(tmplList.map((t) => t.teacher_id)));
  const { data: teacherData } = await supabase
    .from("user")
    .select("id, name")
    .in("id", teacherIds);

  const teacherMap = new Map(
    ((teacherData as Pick<User, "id" | "name">[]) || []).map((t) => [t.id, t.name])
  );

  // Build response
  const lessons = ((instances as LessonInstance[]) || []).map((inst) => {
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
    };
  });

  lessons.sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return a.start_time.localeCompare(b.start_time);
  });

  return NextResponse.json({
    lessons,
    week_start: formatDate(weekStart),
    week_end: formatDate(weekEnd),
  });
}
