import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { buildInstanceInserts } from "@/lib/schedule";
import type { LessonTemplate } from "@/types/database";

/**
 * GET /api/schedule/templates/:classId
 *
 * List all templates for a class.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { classId: string } }
) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("lesson_template")
    .select()
    .eq("class_id", params.classId)
    .order("day_of_week")
    .order("start_time");

  if (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json({ error: "שגיאת שרת." }, { status: 500 });
  }

  return NextResponse.json({ templates: data as LessonTemplate[] });
}

/**
 * PUT /api/schedule/templates/:classId
 *
 * Update a template (classId here is actually templateId).
 * On update → regenerate future instances.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { classId: string } }
) {
  const templateId = params.classId; // The route parameter serves as templateId for PUT
  const role = request.headers.get("x-user-role");
  if (role !== "admin" && role !== "teacher") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  let body: Partial<{
    teacher_id: string;
    subject: string;
    day_of_week: number;
    start_time: string;
    duration_minutes: number;
  }>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף בקשה לא תקין." }, { status: 400 });
  }

  const supabase = createServerClient();

  // Fetch current template to know the old day_of_week
  const { data: existing } = await supabase
    .from("lesson_template")
    .select()
    .eq("id", templateId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "תבנית לא נמצאה." }, { status: 404 });
  }

  // Build update object (only provided fields)
  const update: Record<string, unknown> = {};
  if (body.teacher_id) update.teacher_id = body.teacher_id;
  if (body.subject?.trim()) update.subject = body.subject.trim();
  if (body.day_of_week != null) update.day_of_week = body.day_of_week;
  if (body.start_time) update.start_time = body.start_time;
  if (body.duration_minutes) update.duration_minutes = body.duration_minutes;

  const { data: updated, error: updateError } = await supabase
    .from("lesson_template")
    .update(update as never)
    .eq("id", templateId)
    .select()
    .single();

  if (updateError) {
    console.error("Error updating template:", updateError);
    return NextResponse.json({ error: "שגיאה בעדכון." }, { status: 500 });
  }

  const tmpl = updated as LessonTemplate;

  // If day_of_week changed, generate instances for the new day
  if (body.day_of_week != null && body.day_of_week !== (existing as LessonTemplate).day_of_week) {
    // Get existing instance dates for this template
    const { data: existingInstances } = await supabase
      .from("lesson_instance")
      .select("date")
      .eq("template_id", templateId);

    const existingDates = new Set(
      (existingInstances || []).map((i: { date: string }) => i.date)
    );

    const newInstances = buildInstanceInserts(
      templateId,
      body.day_of_week,
      existingDates
    );

    if (newInstances.length > 0) {
      await supabase.from("lesson_instance").insert(newInstances as never[]);
    }
  }

  return NextResponse.json({ template: tmpl });
}

/**
 * DELETE /api/schedule/templates/:classId
 *
 * Delete a template (classId is templateId for DELETE).
 * Future instances are cascade-deleted by the DB FK constraint.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { classId: string } }
) {
  const templateId = params.classId;
  const role = request.headers.get("x-user-role");
  if (role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from("lesson_template")
    .delete()
    .eq("id", templateId);

  if (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json({ error: "שגיאה במחיקה." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
