import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { ParentStudent, Student, User, Class } from "@/types/database";

/**
 * GET /api/parent/children
 *
 * Returns linked children for the logged-in parent.
 * Joins: ParentStudent → Student → User + Class.
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role");

  if (!userId || role !== "parent") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  const supabase = createServerClient();

  // Get parent-student links
  const { data: links, error: linksError } = await supabase
    .from("parent_student")
    .select()
    .eq("parent_id", userId);

  if (linksError) {
    console.error("Error fetching parent links:", linksError);
    return NextResponse.json({ error: "שגיאת שרת." }, { status: 500 });
  }

  if (!links || links.length === 0) {
    return NextResponse.json({ children: [], last_viewed_id: null });
  }

  const parentLinks = links as ParentStudent[];
  const studentIds = parentLinks.map((l) => l.student_id);

  // Fetch students
  const { data: students } = await supabase
    .from("student")
    .select()
    .in("id", studentIds);

  if (!students || students.length === 0) {
    return NextResponse.json({ children: [], last_viewed_id: null });
  }

  const studentRows = students as Student[];
  const userIds = studentRows.map((s) => s.user_id);
  const classIds = Array.from(new Set(studentRows.map((s) => s.class_id)));

  // Fetch user names and class info in parallel
  const [usersRes, classesRes] = await Promise.all([
    supabase.from("user").select("id, name").in("id", userIds),
    supabase.from("class").select().in("id", classIds),
  ]);

  const userMap = new Map(
    ((usersRes.data as Pick<User, "id" | "name">[]) || []).map((u) => [u.id, u.name])
  );
  const classMap = new Map(
    ((classesRes.data as Class[]) || []).map((c) => [c.id, c])
  );

  // Find last_viewed
  const lastViewedLink = parentLinks.find((l) => l.last_viewed);
  const lastViewedId = lastViewedLink?.student_id || studentIds[0];

  // Build response
  const children = studentRows.map((s) => {
    const cls = classMap.get(s.class_id);
    return {
      student_id: s.id,
      class_id: s.class_id,
      name: userMap.get(s.user_id) || "—",
      class_name: cls?.name || "—",
      grade: cls?.grade || 0,
    };
  });

  return NextResponse.json({ children, last_viewed_id: lastViewedId });
}

/**
 * PUT /api/parent/children
 *
 * Update last_viewed flag for a child.
 * Body: { student_id: string }
 */
export async function PUT(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const role = request.headers.get("x-user-role");

  if (!userId || role !== "parent") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  let body: { student_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף בקשה לא תקין." }, { status: 400 });
  }

  if (!body.student_id) {
    return NextResponse.json({ error: "חסר מזהה תלמיד." }, { status: 400 });
  }

  const supabase = createServerClient();

  // Clear all last_viewed for this parent
  await supabase
    .from("parent_student")
    .update({ last_viewed: false } as never)
    .eq("parent_id", userId);

  // Set new last_viewed
  await supabase
    .from("parent_student")
    .update({ last_viewed: true } as never)
    .eq("parent_id", userId)
    .eq("student_id", body.student_id);

  return NextResponse.json({ success: true });
}
