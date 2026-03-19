"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WeeklyGrid } from "@/components/schedule/WeeklyGrid";
import type { WeekLesson } from "@/components/schedule/WeeklyGrid";

// ============================================
// Types
// ============================================

interface LessonResource {
  url: string;
  label: string;
}

interface Lesson {
  id: string;
  template_id: string;
  date: string;
  subject: string;
  teacher_name: string;
  start_time: string; // HH:MM:SS or HH:MM
  duration_minutes: number;
  meeting_url: string | null;
  status: "scheduled" | "active" | "completed" | "cancelled";
  cancelled_reason: string | null;
  notes: string | null;
  resources: LessonResource[] | null;
}

type LessonDisplayStatus =
  | "active"    // Currently in progress → green + pulse
  | "pending"   // Not started yet → gray
  | "ended"     // Already finished → pale
  | "cancelled" // Cancelled → strikethrough
  | "no-link";  // Upcoming but no meeting URL → warning

// ============================================
// Constants
// ============================================

const REFRESH_INTERVAL_MS = 60 * 1000; // 60 seconds

const STATUS_STYLES: Record<LessonDisplayStatus, string> = {
  active: "border-green-400 bg-green-50",
  pending: "border-gray-200 bg-white",
  ended: "border-gray-200 bg-gray-50 opacity-60",
  cancelled: "border-gray-200 bg-gray-50 opacity-40",
  "no-link": "border-amber-300 bg-amber-50",
};

const STATUS_DOT: Record<LessonDisplayStatus, string> = {
  active: "bg-green-500 animate-pulse",
  pending: "bg-gray-400",
  ended: "bg-gray-300",
  cancelled: "bg-gray-300",
  "no-link": "bg-amber-500",
};

const STATUS_LABELS: Record<LessonDisplayStatus, string> = {
  active: "בשידור חי",
  pending: "ממתין",
  ended: "הסתיים",
  cancelled: "בוטל",
  "no-link": "חסר קישור",
};

// ============================================
// Helpers
// ============================================

function computeDisplayStatus(lesson: Lesson, now: Date): LessonDisplayStatus {
  if (lesson.status === "cancelled") return "cancelled";
  if (lesson.status === "completed") return "ended";

  // Parse start time
  const [h, m] = lesson.start_time.split(":").map(Number);
  const startMinutes = h * 60 + m;
  const endMinutes = startMinutes + lesson.duration_minutes;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (nowMinutes >= endMinutes) return "ended";
  if (nowMinutes >= startMinutes && nowMinutes < endMinutes) {
    return "active";
  }

  // Upcoming — check if it has a meeting URL
  if (!lesson.meeting_url) return "no-link";
  return "pending";
}

function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5); // HH:MM
}

function formatEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + durationMinutes;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
}

const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function formatDateHebrew(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const dayName = DAY_NAMES[d.getDay()];
  const day = d.getDate();
  const month = d.getMonth() + 1;
  return `יום ${dayName}, ${day}/${month}`;
}

// ============================================
// Component
// ============================================

interface StudentScheduleProps {
  classId?: string; // Optional override (used by parent view)
  childTag?: string; // Color tag for multi-child mode
  childColor?: string;
}

export function StudentSchedule({ classId, childTag, childColor }: StudentScheduleProps) {
  const [view, setView] = useState<"daily" | "weekly">("daily");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [weekLessons, setWeekLessons] = useState<Lesson[]>([]);
  const [date, setDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(new Date());

  const fetchSchedule = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (classId) params.set("class_id", classId);

      const res = await fetch(`/api/schedule/today?${params}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "שגיאה בטעינת המערכת.");
        return;
      }

      const data = await res.json();
      setLessons(data.lessons || []);
      setDate(data.date || "");
      setError("");
    } catch {
      setError("שגיאת תקשורת.");
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  const fetchWeek = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (classId) params.set("class_id", classId);
      const res = await fetch(`/api/schedule/week?${params}`);
      if (res.ok) {
        const data = await res.json();
        setWeekLessons(data.lessons || []);
      }
    } catch { /* silent */ }
  }, [classId]);

  // Initial fetch
  useEffect(() => {
    fetchSchedule();
    fetchWeek();
  }, [fetchSchedule, fetchWeek]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
      fetchSchedule();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchSchedule]);

  const handleJoin = (lesson: Lesson) => {
    if (!lesson.meeting_url) return;

    // Record join intent
    fetch(`/api/attendance/${lesson.id}`, { method: "POST" }).catch(() => {
      // Silently fail — attendance recording is non-blocking
    });

    // Open meeting in new tab
    window.open(lesson.meeting_url, "_blank", "noopener,noreferrer");
  };

  // ============================================
  // Render
  // ============================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">טוען מערכת שעות...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-4 text-center">
        <p className="text-sm font-medium text-red-700">{error}</p>
        <Button size="sm" variant="outline" className="mt-2" onClick={fetchSchedule}>
          נסה שוב
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + view toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-center sm:text-right">
          <h2 className="text-2xl font-bold text-gray-900">
            {view === "daily" ? "המערכת שלי להיום" : "מערכת שבועית"}
          </h2>
          {date && view === "daily" && (
            <p className="text-sm text-gray-500">{formatDateHebrew(date)}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={view === "daily" ? "default" : "outline"}
            onClick={() => setView("daily")}
          >
            📅 יומי
          </Button>
          <Button
            size="sm"
            variant={view === "weekly" ? "default" : "outline"}
            onClick={() => setView("weekly")}
          >
            📊 שבועי
          </Button>
        </div>
      </div>

      {/* Weekly view */}
      {view === "weekly" && (
        <WeeklyGrid
          lessons={weekLessons.map((l): WeekLesson => ({
            ...l,
            tag: childTag,
            tagColor: childColor,
          }))}
          onDayClick={(_day, dayDate) => {
            if (dayDate) {
              setDate(dayDate);
              setView("daily");
              // Re-fetch for selected day
              fetch(`/api/schedule/today?${classId ? `class_id=${classId}&` : ""}date=${dayDate}`)
                .then((r) => r.json())
                .then((d) => { setLessons(d.lessons || []); setDate(d.date || dayDate); })
                .catch(() => {});
            }
          }}
        />
      )}

      {/* Daily view — No lessons */}
      {view === "daily" && lessons.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg text-gray-400">אין שיעורים היום 🎉</p>
          </CardContent>
        </Card>
      )}

      {/* Lesson list (daily only) */}
      {view === "daily" && <div className="space-y-3">
        {lessons.map((lesson) => {
          const displayStatus = computeDisplayStatus(lesson, now);
          return (
            <Card
              key={lesson.id}
              className={`transition-all duration-300 border-2 ${STATUS_STYLES[displayStatus]}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  {/* Left side: lesson info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Status dot */}
                    <div className="pt-1.5">
                      <div
                        className={`h-3 w-3 rounded-full ${STATUS_DOT[displayStatus]}`}
                        title={STATUS_LABELS[displayStatus]}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Subject */}
                      <p
                        className={`text-lg font-semibold ${
                          displayStatus === "cancelled"
                            ? "line-through text-gray-400"
                            : "text-gray-900"
                        }`}
                      >
                        {lesson.subject}
                      </p>

                      {/* Time + teacher */}
                      <p className="text-sm text-gray-500">
                        {formatTime(lesson.start_time)} –{" "}
                        {formatEndTime(lesson.start_time, lesson.duration_minutes)}
                        {" · "}
                        {lesson.teacher_name}
                      </p>

                      {/* Status label */}
                      <p className={`text-xs mt-1 ${
                        displayStatus === "active"
                          ? "text-green-600 font-semibold"
                          : displayStatus === "no-link"
                            ? "text-amber-600"
                            : "text-gray-400"
                      }`}>
                        {STATUS_LABELS[displayStatus]}
                        {displayStatus === "cancelled" && lesson.cancelled_reason && (
                          <span> — {lesson.cancelled_reason}</span>
                        )}
                      </p>

                      {/* Notes */}
                      {lesson.notes && (
                        <p className="text-sm text-gray-600 mt-1 bg-blue-50 rounded px-2 py-1">
                          📝 {lesson.notes}
                        </p>
                      )}

                      {/* Resources */}
                      {lesson.resources && lesson.resources.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {lesson.resources.map((r, idx) => (
                            <a
                              key={idx}
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-blue-600 rounded-full px-2 py-0.5 transition-colors"
                            >
                              🔗 {r.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side: Join button */}
                  {lesson.meeting_url &&
                    displayStatus !== "ended" &&
                    displayStatus !== "cancelled" && (
                      <Button
                        size="sm"
                        className={
                          displayStatus === "active"
                            ? "bg-green-600 hover:bg-green-700 animate-pulse"
                            : ""
                        }
                        onClick={() => handleJoin(lesson)}
                        aria-label={`הצטרף לשיעור ${lesson.subject}`}
                      >
                        {displayStatus === "active" ? "הצטרף עכשיו" : "הצטרף"}
                      </Button>
                    )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>}

      {/* Last refresh indicator */}
      <p className="text-xs text-center text-gray-400">
        עודכן לאחרונה: {now.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
  );
}
