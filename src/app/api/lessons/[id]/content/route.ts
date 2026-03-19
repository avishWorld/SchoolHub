import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { LessonResource } from "@/types/database";

const MAX_NOTES_LENGTH = 500;
const MAX_RESOURCES = 5;

/**
 * PUT /api/lessons/:id/content
 *
 * Update notes and/or resources for a lesson instance.
 * Body: { notes?: string, resources?: LessonResource[] }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const role = request.headers.get("x-user-role");
  if (role !== "teacher" && role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  let body: { notes?: string; resources?: LessonResource[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף בקשה לא תקין." }, { status: 400 });
  }

  // Validate notes
  if (body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== "string") {
      return NextResponse.json({ error: "הערות חייבות להיות טקסט." }, { status: 400 });
    }
    if (body.notes.length > MAX_NOTES_LENGTH) {
      return NextResponse.json(
        { error: `הערות ארוכות מדי. מקסימום ${MAX_NOTES_LENGTH} תווים.` },
        { status: 400 }
      );
    }
  }

  // Validate resources
  if (body.resources !== undefined && body.resources !== null) {
    if (!Array.isArray(body.resources)) {
      return NextResponse.json({ error: "קישורים חייבים להיות מערך." }, { status: 400 });
    }
    if (body.resources.length > MAX_RESOURCES) {
      return NextResponse.json(
        { error: `מקסימום ${MAX_RESOURCES} קישורים.` },
        { status: 400 }
      );
    }
    for (const r of body.resources) {
      if (!r.url || !r.label) {
        return NextResponse.json({ error: "כל קישור חייב כתובת ותיאור." }, { status: 400 });
      }
      if (!r.url.startsWith("http")) {
        return NextResponse.json({ error: "כתובת קישור לא תקינה." }, { status: 400 });
      }
    }
  }

  const supabase = createServerClient();

  const update: Record<string, unknown> = {};
  if (body.notes !== undefined) update.notes = body.notes || null;
  if (body.resources !== undefined) update.resources = body.resources && body.resources.length > 0 ? body.resources : null;

  const { data, error } = await supabase
    .from("lesson_instance")
    .update(update as never)
    .eq("id", params.id)
    .select("id, notes, resources")
    .single();

  if (error) {
    console.error("Error updating lesson content:", error);
    return NextResponse.json({ error: "שגיאה בעדכון." }, { status: 500 });
  }

  return NextResponse.json({ lesson: data });
}

/**
 * GET /api/lessons/:id/content
 *
 * Get notes and resources for a lesson instance.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("lesson_instance")
    .select("id, notes, resources")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "שיעור לא נמצא." }, { status: 404 });
  }

  return NextResponse.json({ lesson: data });
}
