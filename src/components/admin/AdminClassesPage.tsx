"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { ClassesManager } from "./ClassesManager";

const ADMIN_NAV = [
  { label: "מערכת שעות", href: "/admin" },
  { label: "כיתות", href: "/admin/classes" },
  { label: "משתמשים", href: "/admin/users" },
  { label: "הרשמה", href: "/admin/enrollment" },
];

export function AdminClassesPage({ userName, role }: { userName: string; role: string }) {
  return (
    <DashboardShell title="ניהול בית הספר" userName={userName} role={role} navItems={ADMIN_NAV}>
      <ClassesManager />
    </DashboardShell>
  );
}
