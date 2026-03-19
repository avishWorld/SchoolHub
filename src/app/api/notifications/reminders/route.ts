import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { formatDate } from "@/lib/schedule";
import type { LessonTemplate, LessonInstance } from "@/types/database";

/**
 * GET /api/notifications/reminders
 *
 * Returns lessons starting within 30 minutes that have no meeting link.
 * Used by teacher dashboard to show warning banners.
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role");
  if (!userId || (role !== "teacher" && role !== "admin")) {
    return NextResponse.json({ reminders: [] });
  }

  const supabase = createServerClient();
  const today = formatDate(new Date());
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  // Get teacher's templates
  let query = supabase.from("lesson_template").select();
  if (role === "teacher") {
    query = query.eq("teacher_id", userId);
  }
  const { data: templates } = await query;
  const tmplList = (templates as LessonTemplate[]) || [];
  if (tmplList.length === 0) return NextResponse.json({ reminders: [] });

  const templateIds = tmplList.map((t) => t.id);
  const { data: instances } = await supabase
    .from("lesson_instance")
    .select()
    .in("template_id", templateIds)
    .eq("date", today);

  const instList = (instances as LessonInstance[]) || [];

  // Find lessons starting in <30 min without links
  const reminders = instList
    .filter((inst) => {
      const tmpl = tmplList.find((t) => t.id === inst.template_id);
      if (!tmpl) return false;
      const hasLink = !!(inst.meeting_url || tmpl.meeting_url);
      if (hasLink) return false;

      const [h, m] = tmpl.start_time.split(":").map(Number);
      const startMin = h * 60 + m;
      const minutesUntil = startMin - nowMinutes;
      return minutesUntil > 0 && minutesUntil <= 30;
    })
    .map((inst) => {
      const tmpl = tmplList.find((t) => t.id === inst.template_id)!;
      return {
        instance_id: inst.id,
        subject: tmpl.subject,
        start_time: tmpl.start_time.slice(0, 5),
        class_id: tmpl.class_id,
        minutes_until: (() => {
          const [h, m] = tmpl.start_time.split(":").map(Number);
          return h * 60 + m - nowMinutes;
        })(),
      };
    });

  return NextResponse.json({ reminders });
}
