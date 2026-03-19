"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { DashboardOverview } from "./DashboardOverview";
import { ScheduleBuilder } from "./ScheduleBuilder";
import { DailyDigest } from "./DailyDigest";
import { AtRiskReport } from "./AtRiskReport";
import { Button } from "@/components/ui/button";

const ADMIN_NAV = [
  { label: "סטטוס", href: "/admin" },
  { label: "כיתות", href: "/admin/classes" },
  { label: "משתמשים", href: "/admin/users" },
  { label: "הרשמה", href: "/admin/enrollment" },
];

type AdminView = "overview" | "schedule" | "digest" | "at-risk";

interface AdminDashboardProps {
  userName: string;
  role: string;
}

export function AdminDashboard({ userName, role }: AdminDashboardProps) {
  const [view, setView] = useState<AdminView>("overview");

  return (
    <DashboardShell
      title="ניהול בית הספר"
      userName={userName}
      role={role}
      navItems={ADMIN_NAV}
    >
      {/* View toggle */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant={view === "overview" ? "default" : "outline"} size="sm" onClick={() => setView("overview")}>
          📊 סטטוס
        </Button>
        <Button variant={view === "schedule" ? "default" : "outline"} size="sm" onClick={() => setView("schedule")}>
          📅 מערכת שעות
        </Button>
        <Button variant={view === "digest" ? "default" : "outline"} size="sm" onClick={() => setView("digest")}>
          🤖 סיכום AI
        </Button>
        <Button variant={view === "at-risk" ? "default" : "outline"} size="sm" onClick={() => setView("at-risk")}>
          ⚠️ תלמידים בסיכון
        </Button>
      </div>

      {view === "overview" && <DashboardOverview />}
      {view === "schedule" && <ScheduleBuilder />}
      {view === "digest" && <DailyDigest />}
      {view === "at-risk" && <AtRiskReport />}
    </DashboardShell>
  );
}
