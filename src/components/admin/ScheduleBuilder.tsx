"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// ============================================
// Types
// ============================================

interface ClassOption {
  id: string;
  name: string;
  grade: number;
}

interface Teacher {
  id: string;
  name: string;
}

interface LessonTemplate {
  id: string;
  class_id: string;
  teacher_id: string;
  teacher_name?: string;
  subject: string;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  meeting_url: string | null;
  is_recurring_link: boolean;
}

interface TemplateFormData {
  subject: string;
  teacher_id: string;
  start_time: string;
  duration_minutes: number;
}

// ============================================
// Constants
// ============================================

// Israeli school week: Sunday (0) through Friday (5)
const DAYS = [
  { value: 0, label: "ראשון" },
  { value: 1, label: "שני" },
  { value: 2, label: "שלישי" },
  { value: 3, label: "רביעי" },
  { value: 4, label: "חמישי" },
  { value: 5, label: "שישי" },
];

const HOURS = Array.from({ length: 12 }, (_, i) => {
  const h = i + 7; // 07:00 to 18:00
  return `${h.toString().padStart(2, "0")}:00`;
});

const DEFAULT_DURATION = 45;

const EMPTY_FORM: TemplateFormData = {
  subject: "",
  teacher_id: "",
  start_time: "08:00",
  duration_minutes: DEFAULT_DURATION,
};

// ============================================
// Component
// ============================================

export function ScheduleBuilder() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [templates, setTemplates] = useState<LessonTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Create/edit modal state
  const [showForm, setShowForm] = useState(false);
  const [formDay, setFormDay] = useState<number>(0);
  const [formData, setFormData] = useState<TemplateFormData>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch classes and teachers on mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError("");
      try {
        const [classesRes, teachersRes] = await Promise.all([
          fetch("/api/admin/classes"),
          fetch("/api/admin/users?role=teacher"),
        ]);

        if (classesRes.ok) {
          const data = await classesRes.json();
          setClasses(data.classes || []);
          if (data.classes?.length > 0 && !selectedClassId) {
            setSelectedClassId(data.classes[0].id);
          }
        }

        if (teachersRes.ok) {
          const data = await teachersRes.json();
          setTeachers(data.users || []);
        }
      } catch {
        setError("שגיאה בטעינת הנתונים.");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch templates when class changes
  const loadTemplates = useCallback(async () => {
    if (!selectedClassId) return;
    try {
      const res = await fetch(
        `/api/schedule/templates/${selectedClassId}`
      );
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch {
      setError("שגיאה בטעינת מערכת השעות.");
    }
  }, [selectedClassId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Handlers
  const openCreateForm = (day: number) => {
    setFormDay(day);
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (template: LessonTemplate) => {
    setFormDay(template.day_of_week);
    setFormData({
      subject: template.subject,
      teacher_id: template.teacher_id,
      start_time: template.start_time.slice(0, 5), // HH:MM
      duration_minutes: template.duration_minutes,
    });
    setEditingId(template.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.subject.trim() || !formData.teacher_id) {
      setError("יש למלא מקצוע ומורה.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const payload = {
        class_id: selectedClassId,
        teacher_id: formData.teacher_id,
        subject: formData.subject.trim(),
        day_of_week: formDay,
        start_time: formData.start_time,
        duration_minutes: formData.duration_minutes,
      };

      const url = editingId
        ? `/api/schedule/templates/${editingId}`
        : "/api/schedule/templates";

      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "שגיאה בשמירה.");
        return;
      }

      setShowForm(false);
      setFormData(EMPTY_FORM);
      setEditingId(null);
      await loadTemplates();
    } catch {
      setError("שגיאת תקשורת.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      const res = await fetch(`/api/schedule/templates/${templateId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadTemplates();
      }
    } catch {
      setError("שגיאה במחיקה.");
    }
  };

  // Group templates by day
  const templatesByDay = DAYS.map((day) => ({
    ...day,
    templates: templates
      .filter((t) => t.day_of_week === day.value)
      .sort((a, b) => a.start_time.localeCompare(b.start_time)),
  }));

  const getTeacherName = (id: string) =>
    teachers.find((t) => t.id === id)?.name || "—";

  // ============================================
  // Render
  // ============================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">טוען...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header: Class selector */}
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">מערכת שעות שבועית</h2>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          aria-label="בחר כיתה"
        >
          {classes.length === 0 && (
            <option value="">אין כיתות</option>
          )}
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name} (כיתה {cls.grade})
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 border border-red-200 p-3"
        >
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {/* Weekly grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templatesByDay.map((day) => (
          <Card key={day.value}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">יום {day.label}</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openCreateForm(day.value)}
                  aria-label={`הוסף שיעור ליום ${day.label}`}
                >
                  + שיעור
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {day.templates.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  אין שיעורים
                </p>
              ) : (
                day.templates.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-start justify-between rounded-lg border bg-gray-50 p-3 text-sm"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-gray-900">
                        {t.subject}
                      </p>
                      <p className="text-gray-500">
                        {t.start_time.slice(0, 5)} · {t.duration_minutes} דק׳
                        · {getTeacherName(t.teacher_id)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditForm(t)}
                        aria-label={`ערוך ${t.subject}`}
                      >
                        ✏️
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(t.id)}
                        aria-label={`מחק ${t.subject}`}
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit form modal (inline) */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>
                {editingId ? "עריכת שיעור" : "שיעור חדש"} — יום{" "}
                {DAYS.find((d) => d.value === formDay)?.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Subject */}
              <div className="space-y-1">
                <label
                  htmlFor="subject"
                  className="text-sm font-medium text-gray-700"
                >
                  מקצוע
                </label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  placeholder="מתמטיקה, אנגלית..."
                  autoFocus
                />
              </div>

              {/* Teacher */}
              <div className="space-y-1">
                <label
                  htmlFor="teacher"
                  className="text-sm font-medium text-gray-700"
                >
                  מורה
                </label>
                <select
                  id="teacher"
                  value={formData.teacher_id}
                  onChange={(e) =>
                    setFormData({ ...formData, teacher_id: e.target.value })
                  }
                  className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">בחר מורה...</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="start-time"
                    className="text-sm font-medium text-gray-700"
                  >
                    שעת התחלה
                  </label>
                  <select
                    id="start-time"
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                    className="flex h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="duration"
                    className="text-sm font-medium text-gray-700"
                  >
                    משך (דקות)
                  </label>
                  <Input
                    id="duration"
                    type="number"
                    min={15}
                    max={120}
                    step={5}
                    value={formData.duration_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration_minutes: parseInt(e.target.value) || DEFAULT_DURATION,
                      })
                    }
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "שומר..." : "שמור"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setError("");
                  }}
                >
                  ביטול
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
