"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { StudentSchedule } from "./StudentSchedule";

interface StudentDashboardProps {
  userName: string;
  role: string;
}

export function StudentDashboard({ userName, role }: StudentDashboardProps) {
  return (
    <DashboardShell
      title="לוח השיעורים שלי"
      userName={userName}
      role={role}
      navItems={[{ label: "מערכת היום", href: "/student" }]}
    >
      <StudentSchedule />
    </DashboardShell>
  );
}
