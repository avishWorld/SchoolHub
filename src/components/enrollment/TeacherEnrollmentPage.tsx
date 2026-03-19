"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { EnrollmentApproval } from "./EnrollmentApproval";
import { InviteLinkManager } from "./InviteLinkManager";

export function TeacherEnrollmentPage({ userName, role }: { userName: string; role: string }) {
  return (
    <DashboardShell
      title="ניהול שיעורים"
      userName={userName}
      role={role}
      navItems={[
        { label: "שיעורים", href: "/teacher" },
        { label: "הרשמה", href: "/teacher/enrollment" },
      ]}
    >
      <div className="space-y-8">
        <InviteLinkManager />
        <EnrollmentApproval />
      </div>
    </DashboardShell>
  );
}
