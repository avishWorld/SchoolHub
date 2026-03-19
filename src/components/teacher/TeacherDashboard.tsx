"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { TeacherLessons } from "./TeacherLessons";

interface Reminder {
  instance_id: string;
  subject: string;
  start_time: string;
  minutes_until: number;
}

interface TeacherDashboardProps {
  userName: string;
  role: string;
}

export function TeacherDashboard({ userName, role }: TeacherDashboardProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/notifications/reminders");
        if (res.ok) {
          const data = await res.json();
          setReminders(data.reminders || []);
        }
      } catch { /* silent */ }
    }
    check();
    const interval = setInterval(check, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const visibleReminders = reminders.filter((r) => !dismissed.has(r.instance_id));

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
      {/* Smart Reminders Banner */}
      {visibleReminders.length > 0 && (
        <div className="space-y-2 mb-4">
          {visibleReminders.map((r) => (
            <div
              key={r.instance_id}
              className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-300 p-3"
              role="alert"
            >
              <p className="text-sm font-medium text-amber-800">
                ⚠️ חסר קישור לשיעור <strong>{r.subject}</strong> בעוד {r.minutes_until} דקות ({r.start_time})
              </p>
              <button
                onClick={() => setDismissed((prev) => new Set(prev).add(r.instance_id))}
                className="text-amber-600 hover:text-amber-800 text-lg"
                aria-label="סגור תזכורת"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <TeacherLessons />
    </DashboardShell>
  );
}
