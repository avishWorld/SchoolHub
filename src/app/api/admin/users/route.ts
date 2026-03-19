import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { generateUniquePin } from "@/lib/pin";
import { logAuditAction } from "@/lib/audit";
import type { User, UserRole } from "@/types/database";

/**
 * GET /api/admin/users
 */
export async function GET(request: NextRequest) {
  const schoolId = request.headers.get("x-school-id");
  if (!schoolId) {
    return NextResponse.json({ error: "חסר מזהה בית ספר." }, { status: 400 });
  }

  const role = request.nextUrl.searchParams.get("role");

  const supabase = createServerClient();
  let query = supabase
    .from("user")
    .select("id, name, role, email, phone, is_active")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("name");

  if (role) {
    query = query.eq("role", role);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "שגיאת שרת." }, { status: 500 });
  }

  return NextResponse.json({ users: data as Partial<User>[] });
}

/**
 * POST /api/admin/users
 * Create user with auto-generated PIN.
 * Body: { name, role, email?, phone?, class_id? (for students) }
 * Returns: { user, pin } — pin is the plaintext shown once.
 */
export async function POST(request: NextRequest) {
  const adminRole = request.headers.get("x-user-role");
  const schoolId = request.headers.get("x-school-id");
  const adminId = request.headers.get("x-user-id");
  if (adminRole !== "admin" || !schoolId) {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  let body: {
    name: string;
    role: UserRole;
    email?: string;
    phone?: string;
    class_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף בקשה לא תקין." }, { status: 400 });
  }

  if (!body.name?.trim() || !body.role) {
    return NextResponse.json({ error: "חסר שם או תפקיד." }, { status: 400 });
  }

  const validRoles: UserRole[] = ["student", "parent", "teacher", "admin"];
  if (!validRoles.includes(body.role)) {
    return NextResponse.json({ error: "תפקיד לא תקין." }, { status: 400 });
  }

  // Generate unique PIN
  const { plain: pinPlain, hash: pinHash } = await generateUniquePin(schoolId);

  const supabase = createServerClient();
  const { data: user, error: insertError } = await supabase
    .from("user")
    .insert({
      school_id: schoolId,
      name: body.name.trim(),
      role: body.role,
      pin: pinHash,
      email: body.email || null,
      phone: body.phone || null,
    } as never)
    .select("id, name, role, email, phone")
    .single();

  if (insertError) {
    console.error("Error creating user:", insertError);
    return NextResponse.json({ error: "שגיאה ביצירת משתמש." }, { status: 500 });
  }

  const createdUser = user as Partial<User>;

  // If student, also create Student record
  if (body.role === "student" && body.class_id && createdUser.id) {
    await supabase
      .from("student")
      .insert({ user_id: createdUser.id, class_id: body.class_id } as never);
  }

  await logAuditAction({
    schoolId, userId: adminId || "",
    action: "user_created", targetType: "user",
    targetId: createdUser.id,
    details: { name: body.name, role: body.role },
  });

  return NextResponse.json({ user: createdUser, pin: pinPlain });
}

/**
 * PUT /api/admin/users
 * Update user or deactivate.
 * Body: { id, name?, email?, phone?, is_active? }
 */
export async function PUT(request: NextRequest) {
  const adminRole = request.headers.get("x-user-role");
  const schoolId = request.headers.get("x-school-id");
  const adminId = request.headers.get("x-user-id");
  if (adminRole !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  let body: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    is_active?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף בקשה לא תקין." }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "חסר מזהה משתמש." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (body.name?.trim()) update.name = body.name.trim();
  if (body.email !== undefined) update.email = body.email || null;
  if (body.phone !== undefined) update.phone = body.phone || null;
  if (body.is_active !== undefined) update.is_active = body.is_active;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("user")
    .update(update as never)
    .eq("id", body.id)
    .select("id, name, role, email, phone, is_active")
    .single();

  if (error) {
    return NextResponse.json({ error: "שגיאה בעדכון." }, { status: 500 });
  }

  const action = body.is_active === false ? "user_deactivated" : "user_updated";
  await logAuditAction({
    schoolId: schoolId || "", userId: adminId || "",
    action, targetType: "user", targetId: body.id, details: update,
  });

  return NextResponse.json({ user: data as Partial<User> });
}
