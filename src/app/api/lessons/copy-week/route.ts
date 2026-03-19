import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { formatDate } from "@/lib/schedule";
import type { LessonInstance } from "@/types/database";

/**
 * POST /api/lessons/copy-week
 *
 * Copy last week's meeting links to this week's instances.
 * Body: { class_id: string }
 */
export async function POST(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  if (role !== "teacher" && role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  let body: { class_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף בקשה לא תקין." }, { status: 400 });
  }

  if (!body.class_id) {
    return NextResponse.json({ error: "חסר מזהה כיתה." }, { status: 400 });
  }

  const supabase = createServerClient();

  // Calculate date ranges
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();

  // This week: Sunday to Saturday
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - dayOfWeek);
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekStart.getDate() + 6);

  // Last week
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(thisWeekStart.getDate() - 1);

  // Get templates for this class
  const { data: templates } = await supabase
    .from("lesson_template")
    .select("id")
    .eq("class_id", body.class_id);

  if (!templates || templates.length === 0) {
    return NextResponse.json({ copied: 0 });
  }

  const templateIds = (templates as { id: string }[]).map((t) => t.id);

  // Fetch last week's instances with URLs
  const { data: lastWeekInstances } = await supabase
    .from("lesson_instance")
    .select()
    .in("template_id", templateIds)
    .gte("date", formatDate(lastWeekStart))
    .lte("date", formatDate(lastWeekEnd))
    .not("meeting_url", "is", null);

  if (!lastWeekInstances || lastWeekInstances.length === 0) {
    return NextResponse.json({ copied: 0 });
  }

  // Build a map: template_id → meeting_url from last week
  const linkMap = new Map<string, string>();
  for (const inst of lastWeekInstances as LessonInstance[]) {
    if (inst.meeting_url) {
      linkMap.set(inst.template_id, inst.meeting_url);
    }
  }

  // Fetch this week's instances (without URLs)
  const { data: thisWeekInstances } = await supabase
    .from("lesson_instance")
    .select()
    .in("template_id", templateIds)
    .gte("date", formatDate(thisWeekStart))
    .lte("date", formatDate(thisWeekEnd))
    .is("meeting_url", null);

  if (!thisWeekInstances || thisWeekInstances.length === 0) {
    return NextResponse.json({ copied: 0 });
  }

  // Update this week's instances with last week's URLs
  let copied = 0;
  for (const inst of thisWeekInstances as LessonInstance[]) {
    const url = linkMap.get(inst.template_id);
    if (url) {
      const { error } = await supabase
        .from("lesson_instance")
        .update({ meeting_url: url } as never)
        .eq("id", inst.id);
      if (!error) copied++;
    }
  }

  return NextResponse.json({ copied });
}
