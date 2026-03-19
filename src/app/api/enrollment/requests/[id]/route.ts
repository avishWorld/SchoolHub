import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { generateUniquePin } from "@/lib/pin";
import { logAuditAction } from "@/lib/audit";
import type { EnrollmentRequest, Invitation } from "@/types/database";

/**
 * PUT /api/enrollment/requests/:id
 *
 * Approve or reject an enrollment request.
 * Body: { action: "approve" | "reject", reject_reason?: string }
 *
 * On approve:
 *   1. Create User with generated PIN
 *   2. If role=student → create Student record linked to class
 *   3. If role=parent + children_names → create Student + ParentStudent records
 *   4. Update request status
 *   5. Log to audit
 *   6. Return the plaintext PIN (shown once)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const role = request.headers.get("x-user-role");
  const userId = request.headers.get("x-user-id");
  const schoolId = request.headers.get("x-school-id");

  // Only admin or homeroom teacher can approve/reject enrollment
  if (role === "admin" && schoolId) {
    // Admin — allowed
  } else if (role === "teacher" && userId && schoolId) {
    const supabaseCheck = createServerClient();
    const { data: teacherData } = await supabaseCheck
      .from("user")
      .select("is_homeroom_teacher")
      .eq("id", userId)
      .single();
    if (!(teacherData as { is_homeroom_teacher: boolean } | null)?.is_homeroom_teacher) {
      return NextResponse.json({ error: "רק מחנך כיתה או מנהל יכולים לאשר הרשמות." }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  let body: { action: "approve" | "reject"; reject_reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף בקשה לא תקין." }, { status: 400 });
  }

  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json({ error: "פעולה לא תקינה." }, { status: 400 });
  }

  const supabase = createServerClient();

  // Fetch the enrollment request
  const { data: reqData } = await supabase
    .from("enrollment_request")
    .select()
    .eq("id", params.id)
    .single();

  if (!reqData) {
    return NextResponse.json({ error: "בקשה לא נמצאה." }, { status: 404 });
  }

  const enrollReq = reqData as EnrollmentRequest;

  if (enrollReq.status !== "pending") {
    return NextResponse.json({ error: "הבקשה כבר טופלה." }, { status: 409 });
  }

  // REJECT path
  if (body.action === "reject") {
    await supabase
      .from("enrollment_request")
      .update({
        status: "rejected",
        reject_reason: body.reject_reason || null,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      } as never)
      .eq("id", params.id);

    await logAuditAction({
      schoolId, userId: userId || "",
      action: "enrollment_rejected", targetType: "enrollment_request",
      targetId: params.id, details: { reason: body.reject_reason },
    });

    return NextResponse.json({ status: "rejected" });
  }

  // APPROVE path
  // Get class_id from the invitation
  const { data: invitation } = await supabase
    .from("invitation")
    .select()
    .eq("id", enrollReq.invitation_id)
    .single();

  if (!invitation) {
    return NextResponse.json({ error: "הזמנה לא נמצאה." }, { status: 404 });
  }

  const inv = invitation as Invitation;

  // Generate PIN
  const { plain: pinPlain, hash: pinHash } = await generateUniquePin(schoolId);

  // Create User
  const { data: newUser, error: userError } = await supabase
    .from("user")
    .insert({
      school_id: schoolId,
      name: enrollReq.name,
      role: enrollReq.role,
      pin: pinHash,
      email: enrollReq.email || null,
      phone: enrollReq.phone || null,
    } as never)
    .select("id, name, role")
    .single();

  if (userError || !newUser) {
    console.error("Error creating user from enrollment:", userError);
    return NextResponse.json({ error: "שגיאה ביצירת משתמש." }, { status: 500 });
  }

  const createdUser = newUser as { id: string; name: string; role: string };

  // Create Student/ParentStudent records
  if (enrollReq.role === "student") {
    await supabase
      .from("student")
      .insert({ user_id: createdUser.id, class_id: inv.class_id } as never);
  } else if (enrollReq.role === "parent" && enrollReq.children_names?.length) {
    // Create student records for each child, then link to parent
    for (const childName of enrollReq.children_names) {
      const { plain: childPin, hash: childHash } = await generateUniquePin(schoolId);

      const { data: childUser } = await supabase
        .from("user")
        .insert({
          school_id: schoolId,
          name: childName,
          role: "student",
          pin: childHash,
          email: null,
          phone: null,
        } as never)
        .select("id")
        .single();

      if (childUser) {
        const { data: studentRecord } = await supabase
          .from("student")
          .insert({ user_id: (childUser as { id: string }).id, class_id: inv.class_id } as never)
          .select("id")
          .single();

        if (studentRecord) {
          await supabase.from("parent_student").insert({
            parent_id: createdUser.id,
            student_id: (studentRecord as { id: string }).id,
          } as never);
        }
      }

      // Note: child PINs are NOT returned — admin can reset later
      void childPin;
    }
  }

  // Update request status
  await supabase
    .from("enrollment_request")
    .update({
      status: "approved",
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    } as never)
    .eq("id", params.id);

  await logAuditAction({
    schoolId, userId: userId || "",
    action: "enrollment_approved", targetType: "enrollment_request",
    targetId: params.id, details: { new_user_id: createdUser.id },
  });

  return NextResponse.json({
    status: "approved",
    user: createdUser,
    pin: pinPlain,
  });
}
