import { createServerClient } from "@/lib/supabase";

/**
 * Log an admin action to the audit trail.
 */
export async function logAuditAction(params: {
  schoolId: string;
  userId: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase.from("admin_audit_log").insert({
    school_id: params.schoolId,
    user_id: params.userId,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId || null,
    details: params.details || null,
  } as never);

  if (error) {
    console.error("Audit log error:", error);
    // Non-blocking — don't throw
  }
}
