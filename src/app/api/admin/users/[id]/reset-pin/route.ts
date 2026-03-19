import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { generateUniquePin } from "@/lib/pin";
import { logAuditAction } from "@/lib/audit";

/**
 * POST /api/admin/users/:id/reset-pin
 *
 * Generate a new PIN for a user. Returns the plaintext PIN once.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const role = request.headers.get("x-user-role");
  const schoolId = request.headers.get("x-school-id");
  const adminId = request.headers.get("x-user-id");
  if (role !== "admin" || !schoolId) {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  const { plain, hash } = await generateUniquePin(schoolId);

  const supabase = createServerClient();
  const { error } = await supabase
    .from("user")
    .update({ pin: hash } as never)
    .eq("id", params.id);

  if (error) {
    console.error("Error resetting PIN:", error);
    return NextResponse.json({ error: "שגיאה באיפוס PIN." }, { status: 500 });
  }

  await logAuditAction({
    schoolId, userId: adminId || "",
    action: "pin_reset", targetType: "user", targetId: params.id,
  });

  return NextResponse.json({ pin: plain });
}
