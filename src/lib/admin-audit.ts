import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditAction =
  | "user.delete"
  | "user.role_change"
  | "seller.verify"
  | "seller.unverify"
  | "seller.suspend"
  | "seller.delete"
  | "product.takedown"
  | "product.deactivate"
  | "product.reactivate"
  | "review.remove"
  | "report.resolve"
  | "report.reject"
  | "voucher.create"
  | "voucher.update"
  | "voucher.delete"
  | "banner.create"
  | "banner.update"
  | "banner.delete"
  | "broadcast.send"
  | "modflag.approve"
  | "modflag.reject"
  | "settings.update";

export interface AuditEntry {
  adminId: string;
  adminEmail?: string;
  action: AuditAction;
  targetType?: "user" | "seller" | "product" | "review" | "report" | "voucher" | "banner" | "modflag" | "settings" | "broadcast";
  targetId?: string;
  targetLabel?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget audit logger. Records every administrative action so
 * platform admins are accountable for their changes.
 */
export async function logAdminAction(
  supabase: SupabaseClient,
  entry: AuditEntry
): Promise<void> {
  try {
    await supabase.from("admin_audit_log").insert({
      adminId: entry.adminId,
      adminEmail: entry.adminEmail ?? null,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      targetLabel: entry.targetLabel ?? null,
      reason: entry.reason ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (err) {
    console.error("Audit log write failed", err);
  }
}
