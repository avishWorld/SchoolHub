import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { EnrollmentRequest } from "@/types/database";

/**
 * GET /api/enrollment/requests
 *
 * List pending enrollment requests. Optional ?class_id= filter.
 */
export async function GET(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  const schoolId = request.headers.get("x-school-id");
  if ((role !== "teacher" && role !== "admin") || !schoolId) {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  const classId = request.nextUrl.searchParams.get("class_id");

  const supabase = createServerClient();

  // Get invitations for this school
  let invQuery = supabase
    .from("invitation")
    .select("id")
    .eq("school_id", schoolId);

  if (classId) {
    invQuery = invQuery.eq("class_id", classId);
  }

  const { data: invitations } = await invQuery;
  if (!invitations || invitations.length === 0) {
    return NextResponse.json({ requests: [] });
  }

  const invIds = (invitations as { id: string }[]).map((i) => i.id);

  // Get pending requests for these invitations
  const { data, error } = await supabase
    .from("enrollment_request")
    .select()
    .in("invitation_id", invIds)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "שגיאת שרת." }, { status: 500 });
  }

  return NextResponse.json({ requests: data as EnrollmentRequest[] });
}
