"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { UsersManager } from "./UsersManager";

const ADMIN_NAV = [
  { label: "מערכת שעות", href: "/admin" },
  { label: "כיתות", href: "/admin/classes" },
  { label: "משתמשים", href: "/admin/users" },
  { label: "הרשמה", href: "/admin/enrollment" },
];

export function AdminUsersPage({ userName, role }: { userName: string; role: string }) {
  return (
    <DashboardShell title="ניהול בית הספר" userName={userName} role={role} navItems={ADMIN_NAV}>
      <UsersManager />
    </DashboardShell>
  );
}
