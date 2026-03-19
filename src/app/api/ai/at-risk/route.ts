import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { formatDate } from "@/lib/schedule";
import type { Student, Attendance } from "@/types/database";

/**
 * GET /api/ai/at-risk
 *
 * Identifies students with low join rates in the last 7 days.
 * At-risk: <50% join rate.
 * Returns sorted list with name, class, join %, last active date.
 */
export async function GET(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  const schoolId = request.headers.get("x-school-id");
  if (role !== "admin" || !schoolId) {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  const supabase = createServerClient();

  // Date range: last 7 days
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  // Get all classes in school
  const { data: classes } = await supabase.from("class").select("id, name").eq("school_id", schoolId);
  const classMap = new Map(((classes as { id: string; name: string }[]) || []).map((c) => [c.id, c.name]));

  // Get all students
  const classIds = Array.from(classMap.keys());
  if (classIds.length === 0) return NextResponse.json({ students: [] });

  const { data: students } = await supabase.from("student").select("id, user_id, class_id").in("class_id", classIds);
  const studentList = (students as Student[]) || [];
  if (studentList.length === 0) return NextResponse.json({ students: [] });

  // Get student names
  const userIds = studentList.map((s) => s.user_id);
  const { data: users } = await supabase.from("user").select("id, name").in("id", userIds);
  const nameMap = new Map(((users as { id: string; name: string }[]) || []).map((u) => [u.id, u.name]));

  // Get all templates for these classes
  const { data: templates } = await supabase.from("lesson_template").select("id, class_id").in("class_id", classIds);
  const tmplList = (templates as { id: string; class_id: string }[]) || [];

  // Get all instances in the last 7 days
  const templateIds = tmplList.map((t) => t.id);
  if (templateIds.length === 0) return NextResponse.json({ students: [] });

  const { data: instances } = await supabase
    .from("lesson_instance")
    .select("id, template_id, date")
    .in("template_id", templateIds)
    .gte("date", formatDate(weekAgo))
    .lte("date", formatDate(today));

  const instList = (instances as { id: string; template_id: string; date: string }[]) || [];

  // Get all attendance
  const instanceIds = instList.map((i) => i.id);
  let attendanceList: Attendance[] = [];
  if (instanceIds.length > 0) {
    const { data: att } = await supabase.from("attendance").select().in("lesson_instance_id", instanceIds);
    attendanceList = (att as Attendance[]) || [];
  }

  // Calculate per-student join rate
  const atRisk = studentList
    .map((s) => {
      const classTemplates = tmplList.filter((t) => t.class_id === s.class_id);
      const classInstances = instList.filter((i) => classTemplates.some((t) => t.id === i.template_id));
      const totalLessons = classInstances.length;
      if (totalLessons === 0) return null;

      const joined = attendanceList.filter(
        (a) => a.student_id === s.id && a.join_clicked_at
      ).length;

      const joinRate = totalLessons > 0 ? joined / totalLessons : 0;

      const lastJoin = attendanceList
        .filter((a) => a.student_id === s.id && a.join_clicked_at)
        .sort((a, b) => (b.join_clicked_at || "").localeCompare(a.join_clicked_at || ""))[0];

      return {
        student_id: s.id,
        name: nameMap.get(s.user_id) || "—",
        class_name: classMap.get(s.class_id) || "—",
        total_lessons: totalLessons,
        joined,
        join_rate: Math.round(joinRate * 100),
        last_active: lastJoin?.join_clicked_at?.slice(0, 10) || null,
        severity: joinRate < 0.25 ? "high" : joinRate < 0.5 ? "medium" : "low",
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null && s.join_rate < 50)
    .sort((a, b) => a.join_rate - b.join_rate);

  return NextResponse.json({ students: atRisk });
}
