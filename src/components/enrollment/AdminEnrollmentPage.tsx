"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { EnrollmentApproval } from "./EnrollmentApproval";
import { InviteLinkManager } from "./InviteLinkManager";

const ADMIN_NAV = [
  { label: "מערכת שעות", href: "/admin" },
  { label: "כיתות", href: "/admin/classes" },
  { label: "משתמשים", href: "/admin/users" },
  { label: "הרשמה", href: "/admin/enrollment" },
];

export function AdminEnrollmentPage({ userName, role }: { userName: string; role: string }) {
  return (
    <DashboardShell title="ניהול בית הספר" userName={userName} role={role} navItems={ADMIN_NAV}>
      <div className="space-y-8">
        <InviteLinkManager />
        <EnrollmentApproval />
      </div>
    </DashboardShell>
  );
}
