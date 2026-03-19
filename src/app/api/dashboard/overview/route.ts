import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { formatDate } from "@/lib/schedule";
import type { Class, LessonTemplate, LessonInstance } from "@/types/database";

/**
 * GET /api/dashboard/overview
 *
 * Returns per-class status for today's lessons.
 * Status colors:
 *   green  = active lesson with meeting link
 *   yellow = lesson scheduled but missing link
 *   red    = lesson start time passed without link
 *   gray   = no lessons today
 *
 * Includes: class name, grade, current lesson info, join count.
 */

interface ClassStatus {
  class_id: string;
  class_name: string;
  grade: number;
  status: "green" | "yellow" | "red" | "gray";
  current_lesson: {
    subject: string;
    teacher_name: string;
    start_time: string;
    has_link: boolean;
  } | null;
  today_lessons: number;
  missing_links: number;
  join_count: number;
}

export async function GET(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  const schoolId = request.headers.get("x-school-id");
  if (role !== "admin" || !schoolId) {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  const supabase = createServerClient();
  const today = formatDate(new Date());
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  // Get all classes
  const { data: classes } = await supabase
    .from("class")
    .select()
    .eq("school_id", schoolId)
    .order("grade")
    .order("name");

  if (!classes || classes.length === 0) {
    return NextResponse.json({ classes: [], date: today });
  }

  const classList = classes as Class[];
  const classIds = classList.map((c) => c.id);

  // Get all templates for these classes
  const { data: templates } = await supabase
    .from("lesson_template")
    .select()
    .in("class_id", classIds);

  const tmplList = (templates as LessonTemplate[]) || [];
  const templateIds = tmplList.map((t) => t.id);

  // Get teacher names
  const teacherIds = Array.from(new Set(tmplList.map((t) => t.teacher_id)));
  let teacherMap = new Map<string, string>();
  if (teacherIds.length > 0) {
    const { data: teachers } = await supabase
      .from("user")
      .select("id, name")
      .in("id", teacherIds);
    teacherMap = new Map(
      ((teachers as { id: string; name: string }[]) || []).map((t) => [t.id, t.name])
    );
  }

  // Get today's instances
  let instanceList: LessonInstance[] = [];
  if (templateIds.length > 0) {
    const { data: instances } = await supabase
      .from("lesson_instance")
      .select()
      .in("template_id", templateIds)
      .eq("date", today);
    instanceList = (instances as LessonInstance[]) || [];
  }

  // Get attendance join counts
  const instanceIds = instanceList.map((i) => i.id);
  const joinCountMap = new Map<string, number>();
  if (instanceIds.length > 0) {
    const { data: attendance } = await supabase
      .from("attendance")
      .select("lesson_instance_id")
      .in("lesson_instance_id", instanceIds)
      .not("join_clicked_at", "is", null);

    if (attendance) {
      for (const a of attendance as { lesson_instance_id: string }[]) {
        joinCountMap.set(
          a.lesson_instance_id,
          (joinCountMap.get(a.lesson_instance_id) || 0) + 1
        );
      }
    }
  }

  // Build per-class status
  const classStatuses: ClassStatus[] = classList.map((cls) => {
    const classTemplates = tmplList.filter((t) => t.class_id === cls.id);
    const classInstances = instanceList.filter((i) =>
      classTemplates.some((t) => t.id === i.template_id)
    );

    if (classInstances.length === 0) {
      return {
        class_id: cls.id,
        class_name: cls.name,
        grade: cls.grade,
        status: "gray" as const,
        current_lesson: null,
        today_lessons: 0,
        missing_links: 0,
        join_count: 0,
      };
    }

    // Find missing links
    const missingLinks = classInstances.filter((i) => {
      const tmpl = classTemplates.find((t) => t.id === i.template_id);
      return !i.meeting_url && !tmpl?.meeting_url;
    });

    // Find current/next lesson
    let currentLesson = null;
    let status: "green" | "yellow" | "red" = "green";

    for (const inst of classInstances) {
      const tmpl = classTemplates.find((t) => t.id === inst.template_id);
      if (!tmpl) continue;

      const [h, m] = tmpl.start_time.split(":").map(Number);
      const startMin = h * 60 + m;
      const endMin = startMin + tmpl.duration_minutes;
      const hasLink = !!(inst.meeting_url || tmpl.meeting_url);

      // Is this lesson currently active or next?
      if (nowMinutes >= startMin && nowMinutes < endMin) {
        currentLesson = {
          subject: tmpl.subject,
          teacher_name: teacherMap.get(tmpl.teacher_id) || "—",
          start_time: tmpl.start_time,
          has_link: hasLink,
        };
        status = hasLink ? "green" : "red"; // Active without link = RED
        break;
      } else if (nowMinutes < startMin && !currentLesson) {
        currentLesson = {
          subject: tmpl.subject,
          teacher_name: teacherMap.get(tmpl.teacher_id) || "—",
          start_time: tmpl.start_time,
          has_link: hasLink,
        };
        status = hasLink ? "green" : "yellow"; // Future without link = YELLOW
      }
    }

    // If all lessons are past
    if (!currentLesson && classInstances.length > 0) {
      const lastTmpl = classTemplates.find(
        (t) => t.id === classInstances[classInstances.length - 1].template_id
      );
      if (lastTmpl) {
        const hasLink = !!(classInstances[classInstances.length - 1].meeting_url || lastTmpl.meeting_url);
        currentLesson = {
          subject: lastTmpl.subject,
          teacher_name: teacherMap.get(lastTmpl.teacher_id) || "—",
          start_time: lastTmpl.start_time,
          has_link: hasLink,
        };
      }
      status = "green"; // All done
    }

    // Total join count for this class
    const totalJoins = classInstances.reduce(
      (sum, i) => sum + (joinCountMap.get(i.id) || 0),
      0
    );

    return {
      class_id: cls.id,
      class_name: cls.name,
      grade: cls.grade,
      status,
      current_lesson: currentLesson,
      today_lessons: classInstances.length,
      missing_links: missingLinks.length,
      join_count: totalJoins,
    };
  });

  return NextResponse.json({ classes: classStatuses, date: today });
}
