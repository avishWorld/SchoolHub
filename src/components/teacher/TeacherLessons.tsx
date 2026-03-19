"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AttendanceView } from "./AttendanceView";
import { AiLinkParser } from "./AiLinkParser";
import { LessonContentEditor } from "./LessonContentEditor";

// ============================================
// Types
// ============================================

interface ClassOption {
  id: string;
  name: string;
  grade: number;
}

interface LessonInstance {
  id: string;
  template_id: string;
  date: string;
  subject: string;
  teacher_name: string;
  start_time: string;
  duration_minutes: number;
  meeting_url: string | null;
  status: string;
}

// ============================================
// Constants
// ============================================

const DAYS = [
  { value: 0, label: "ראשון" },
  { value: 1, label: "שני" },
  { value: 2, label: "שלישי" },
  { value: 3, label: "רביעי" },
  { value: 4, label: "חמישי" },
  { value: 5, label: "שישי" },
];

const URL_PATTERN = /^https:\/\/([\w.-]*zoom\.us\/|[\w.-]*teams\.microsoft\.com\/|meet\.google\.com\/)/;

// ============================================
// Component
// ============================================

const CLASS_COLORS = ["#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

export function TeacherLessons() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [weekInstances, setWeekInstances] = useState<LessonInstance[]>([]);
  const [allClassInstances, setAllClassInstances] = useState<(LessonInstance & { class_name: string; class_color: string })[]>([]);
  const [viewMode, setViewMode] = useState<"single" | "multi">("single");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Attendance view state
  const [attendanceInstanceId, setAttendanceInstanceId] = useState<string | null>(null);
  const [attendanceSubject, setAttendanceSubject] = useState("");

  // Content editor state
  const [contentInstanceId, setContentInstanceId] = useState<string | null>(null);
  const [contentSubject, setContentSubject] = useState("");

  // AI parser state
  const [showAiParser, setShowAiParser] = useState(false);
  const [aiTargetInstanceId, setAiTargetInstanceId] = useState<string | null>(null);

  // Link editing state
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null);
  const [linkInput, setLinkInput] = useState("");
  const [setRecurring, setSetRecurring] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load classes
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/classes");
        if (res.ok) {
          const data = await res.json();
          setClasses(data.classes || []);
          if (data.classes?.length > 0) {
            setSelectedClassId(data.classes[0].id);
            setSelectedClassIds(data.classes.map((c: ClassOption) => c.id));
          }
        }
      } catch {
        setError("שגיאה בטעינה.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Load week's instances — single API call
  const loadWeek = useCallback(async () => {
    if (!selectedClassId) return;
    try {
      const res = await fetch(`/api/schedule/week?class_id=${selectedClassId}`);
      if (!res.ok) {
        setError("שגיאה בטעינת שיעורים.");
        return;
      }
      const data = await res.json();
      setWeekInstances(data.lessons || []);
    } catch {
      setError("שגיאה בטעינת שיעורים.");
    }
  }, [selectedClassId]);

  useEffect(() => {
    loadWeek();
  }, [loadWeek]);

  // Load all classes data for multi-class view
  useEffect(() => {
    if (viewMode !== "multi" || selectedClassIds.length === 0) return;
    async function loadAll() {
      const results = await Promise.all(
        selectedClassIds.map(async (cid) => {
          const res = await fetch(`/api/schedule/week?class_id=${cid}`);
          if (!res.ok) return [];
          const data = await res.json();
          const cls = classes.find((c) => c.id === cid);
          const idx = classes.indexOf(cls!);
          return (data.lessons || []).map((l: LessonInstance) => ({
            ...l,
            class_name: cls?.name || "—",
            class_color: CLASS_COLORS[idx % CLASS_COLORS.length],
          }));
        })
      );
      setAllClassInstances(results.flat());
    }
    loadAll();
  }, [viewMode, selectedClassIds, classes]);

  // Group by day of week (from date)
  const instancesByDay = DAYS.map((day) => {
    const dayInstances = weekInstances.filter((inst) => {
      const d = new Date(inst.date + "T00:00:00");
      return d.getDay() === day.value;
    });
    return {
      ...day,
      instances: dayInstances.sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      ),
    };
  });

  const handleSaveLink = async (instanceId: string) => {
    if (!linkInput.trim()) {
      setError("יש להזין קישור.");
      return;
    }
    if (!URL_PATTERN.test(linkInput.trim())) {
      setError("קישור לא תקין. נדרש Zoom, Teams או Google Meet.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/lessons/${instanceId}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meeting_url: linkInput.trim(),
          set_recurring: setRecurring,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "שגיאה בשמירה.");
        return;
      }
      setEditingInstanceId(null);
      setLinkInput("");
      setSetRecurring(false);
      await loadWeek();
    } catch {
      setError("שגיאת תקשורת.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyWeek = async () => {
    if (!selectedClassId) return;
    setError("");
    try {
      const res = await fetch("/api/lessons/copy-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_id: selectedClassId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.copied > 0) {
          await loadWeek();
        } else {
          setError("לא נמצאו קישורים להעתקה מהשבוע שעבר.");
        }
      }
    } catch {
      setError("שגיאת תקשורת.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">טוען...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-900">ניהול שיעורים</h2>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={viewMode === "single" ? "default" : "outline"}
            onClick={() => setViewMode("single")}
          >
            כיתה בודדת
          </Button>
          <Button
            size="sm"
            variant={viewMode === "multi" ? "default" : "outline"}
            onClick={() => setViewMode("multi")}
          >
            👁️ כל הכיתות
          </Button>
        </div>
      </div>

      {/* Single class selector */}
      {viewMode === "single" && (
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            aria-label="בחר כיתה"
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} (כיתה {cls.grade})
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={handleCopyWeek}>
            העתק מהשבוע שעבר
          </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAiParser(true)}
        >
          🤖 הדבק טקסט (AI)
        </Button>
        </div>
      )}

      {/* Multi-class filter */}
      {viewMode === "multi" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {classes.map((cls, idx) => {
              const isSelected = selectedClassIds.includes(cls.id);
              return (
                <Button
                  key={cls.id}
                  size="sm"
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => {
                    setSelectedClassIds((prev) =>
                      isSelected
                        ? prev.filter((id) => id !== cls.id)
                        : [...prev, cls.id]
                    );
                  }}
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full ml-1"
                    style={{ backgroundColor: CLASS_COLORS[idx % CLASS_COLORS.length] }}
                  />
                  {cls.name}
                </Button>
              );
            })}
          </div>

          {/* Multi-class daily view — all selected classes sorted by time */}
          <div className="space-y-2">
            {allClassInstances
              .sort((a, b) => a.start_time.localeCompare(b.start_time))
              .map((inst) => (
                <div
                  key={inst.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  style={{ borderRightWidth: 4, borderRightColor: inst.class_color }}
                >
                  <div>
                    <p className="font-semibold">{inst.subject}</p>
                    <p className="text-xs text-gray-500">
                      {inst.start_time.slice(0, 5)} · {inst.duration_minutes} דק׳ · {inst.teacher_name}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">
                    {inst.class_name}
                  </span>
                </div>
              ))}
            {allClassInstances.length === 0 && (
              <p className="text-center text-gray-400 py-8">אין שיעורים השבוע לכיתות הנבחרות</p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {/* Weekly grid (single class mode) */}
      {viewMode === "single" && <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {instancesByDay.map((day) => (
          <Card key={day.value}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">יום {day.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {day.instances.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  אין שיעורים
                </p>
              ) : (
                day.instances.map((inst) => (
                  <div
                    key={inst.id}
                    className="rounded-lg border bg-gray-50 p-3 text-sm space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {inst.subject}
                        </p>
                        <p className="text-gray-500">
                          {inst.start_time.slice(0, 5)} ·{" "}
                          {inst.duration_minutes} דק׳
                        </p>
                      </div>
                    </div>

                    {/* Link display/edit */}
                    {editingInstanceId === inst.id ? (
                      <div className="space-y-2">
                        <Input
                          value={linkInput}
                          onChange={(e) => setLinkInput(e.target.value)}
                          placeholder="https://zoom.us/j/..."
                          dir="ltr"
                          aria-label="קישור למפגש"
                        />
                        <label className="flex items-center gap-2 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            checked={setRecurring}
                            onChange={(e) => setSetRecurring(e.target.checked)}
                          />
                          קישור קבוע (יחול על כל השיעורים הבאים)
                        </label>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveLink(inst.id)}
                            disabled={isSaving}
                          >
                            {isSaving ? "שומר..." : "שמור"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingInstanceId(null);
                              setLinkInput("");
                              setError("");
                            }}
                          >
                            ביטול
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        {inst.meeting_url ? (
                          <p className="text-xs text-blue-600 truncate max-w-[180px]" dir="ltr">
                            {inst.meeting_url}
                          </p>
                        ) : (
                          <p className="text-xs text-amber-600">חסר קישור</p>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingInstanceId(inst.id);
                            setLinkInput(inst.meeting_url || "");
                            setSetRecurring(false);
                          }}
                          aria-label={`ערוך קישור ל${inst.subject}`}
                        >
                          {inst.meeting_url ? "✏️" : "➕"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setAttendanceInstanceId(inst.id);
                            setAttendanceSubject(inst.subject);
                          }}
                          aria-label={`נוכחות ${inst.subject}`}
                          title="נוכחות"
                        >
                          📋
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setContentInstanceId(inst.id);
                            setContentSubject(inst.subject);
                          }}
                          aria-label={`תוכן ${inst.subject}`}
                          title="הערות וקישורים"
                        >
                          📝
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>}

      {/* Lesson Content Editor */}
      {contentInstanceId && (
        <LessonContentEditor
          instanceId={contentInstanceId}
          subject={contentSubject}
          onClose={() => {
            setContentInstanceId(null);
            setContentSubject("");
          }}
          onSaved={() => loadWeek()}
        />
      )}

      {/* AI Link Parser */}
      {showAiParser && (
        <AiLinkParser
          onLinkParsed={(url) => {
            // If we have a target instance, save the URL to it
            if (aiTargetInstanceId) {
              fetch(`/api/lessons/${aiTargetInstanceId}/link`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ meeting_url: url }),
              }).then(() => loadWeek());
            }
            setShowAiParser(false);
            setAiTargetInstanceId(null);
          }}
          onClose={() => {
            setShowAiParser(false);
            setAiTargetInstanceId(null);
          }}
        />
      )}

      {/* Attendance view overlay */}
      {attendanceInstanceId && (
        <AttendanceView
          instanceId={attendanceInstanceId}
          subject={attendanceSubject}
          onClose={() => {
            setAttendanceInstanceId(null);
            setAttendanceSubject("");
          }}
        />
      )}
    </div>
  );
}
