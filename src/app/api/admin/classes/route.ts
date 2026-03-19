import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { logAuditAction } from "@/lib/audit";
import type { Class } from "@/types/database";

/**
 * GET /api/admin/classes
 */
export async function GET(request: NextRequest) {
  const schoolId = request.headers.get("x-school-id");
  const userId = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role");
  if (!schoolId) {
    return NextResponse.json({ error: "חסר מזהה בית ספר." }, { status: 400 });
  }

  const supabase = createServerClient();

  // Teachers only see classes where they have lesson templates
  if (role === "teacher" && userId) {
    const { data: templates } = await supabase
      .from("lesson_template")
      .select("class_id")
      .eq("teacher_id", userId);

    const classIds = Array.from(
      new Set(((templates as { class_id: string }[]) || []).map((t) => t.class_id))
    );

    if (classIds.length === 0) {
      return NextResponse.json({ classes: [] });
    }

    const { data, error } = await supabase
      .from("class")
      .select()
      .in("id", classIds)
      .order("grade")
      .order("name");

    if (error) {
      return NextResponse.json({ error: "שגיאת שרת." }, { status: 500 });
    }
    return NextResponse.json({ classes: data as Class[] });
  }

  // Admin sees all classes
  const { data, error } = await supabase
    .from("class")
    .select()
    .eq("school_id", schoolId)
    .order("grade")
    .order("name");

  if (error) {
    console.error("Error fetching classes:", error);
    return NextResponse.json({ error: "שגיאת שרת." }, { status: 500 });
  }

  return NextResponse.json({ classes: data as Class[] });
}

/**
 * POST /api/admin/classes
 * Body: { name: string, grade: number }
 */
export async function POST(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  const schoolId = request.headers.get("x-school-id");
  const userId = request.headers.get("x-user-id");
  if (role !== "admin" || !schoolId) {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  let body: { name: string; grade: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף בקשה לא תקין." }, { status: 400 });
  }

  if (!body.name?.trim() || !body.grade) {
    return NextResponse.json({ error: "חסר שם כיתה או שכבה." }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("class")
    .insert({ school_id: schoolId, name: body.name.trim(), grade: body.grade } as never)
    .select()
    .single();

  if (error) {
    console.error("Error creating class:", error);
    return NextResponse.json({ error: "שגיאה ביצירת כיתה." }, { status: 500 });
  }

  await logAuditAction({
    schoolId, userId: userId || "",
    action: "class_created", targetType: "class",
    targetId: (data as Class).id,
    details: { name: body.name, grade: body.grade },
  });

  return NextResponse.json({ class: data as Class });
}

/**
 * PUT /api/admin/classes
 * Body: { id: string, name?: string, grade?: number }
 */
export async function PUT(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  const schoolId = request.headers.get("x-school-id");
  const userId = request.headers.get("x-user-id");
  if (role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  let body: { id: string; name?: string; grade?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף בקשה לא תקין." }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "חסר מזהה כיתה." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (body.name?.trim()) update.name = body.name.trim();
  if (body.grade) update.grade = body.grade;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("class")
    .update(update as never)
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "שגיאה בעדכון." }, { status: 500 });
  }

  await logAuditAction({
    schoolId: schoolId || "", userId: userId || "",
    action: "class_updated", targetType: "class",
    targetId: body.id, details: update,
  });

  return NextResponse.json({ class: data as Class });
}

/**
 * DELETE /api/admin/classes
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  const schoolId = request.headers.get("x-school-id");
  const userId = request.headers.get("x-user-id");
  if (role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  let body: { id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף בקשה לא תקין." }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase.from("class").delete().eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: "שגיאה במחיקה." }, { status: 500 });
  }

  await logAuditAction({
    schoolId: schoolId || "", userId: userId || "",
    action: "class_deleted", targetType: "class", targetId: body.id,
  });

  return NextResponse.json({ success: true });
}
