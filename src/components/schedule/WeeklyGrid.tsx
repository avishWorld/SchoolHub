"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DAYS = [
  { value: 0, label: "ראשון" },
  { value: 1, label: "שני" },
  { value: 2, label: "שלישי" },
  { value: 3, label: "רביעי" },
  { value: 4, label: "חמישי" },
  { value: 5, label: "שישי" },
];

export interface WeekLesson {
  id: string;
  date: string;
  subject: string;
  teacher_name: string;
  start_time: string;
  duration_minutes: number;
  meeting_url: string | null;
  status: string;
  notes?: string | null;
  // For multi-child/class coloring
  tag?: string;
  tagColor?: string;
}

interface WeeklyGridProps {
  lessons: WeekLesson[];
  onDayClick?: (dayOfWeek: number, date: string) => void;
  selectedDay?: number | null;
  emptyMessage?: string;
}

export function WeeklyGrid({ lessons, onDayClick, selectedDay, emptyMessage = "אין שיעורים" }: WeeklyGridProps) {
  // Group by day of week
  const byDay = DAYS.map((day) => {
    const dayLessons = lessons.filter((l) => {
      const d = new Date(l.date + "T00:00:00");
      return d.getDay() === day.value;
    });
    return {
      ...day,
      lessons: dayLessons.sort((a, b) => a.start_time.localeCompare(b.start_time)),
      date: dayLessons[0]?.date || "",
    };
  });

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {byDay.map((day) => (
        <Card
          key={day.value}
          className={`transition-all cursor-pointer hover:shadow-md ${
            selectedDay === day.value ? "ring-2 ring-blue-500" : ""
          }`}
          onClick={() => onDayClick?.(day.value, day.date)}
        >
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-base">יום {day.label}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-1.5">
            {day.lessons.length === 0 ? (
              <p className="text-xs text-gray-400 py-2 text-center">{emptyMessage}</p>
            ) : (
              day.lessons.map((l) => {
                const hasLink = !!l.meeting_url;
                const isActive = l.status === "active" || l.status === "scheduled";
                return (
                  <div
                    key={l.id}
                    className={`flex items-center justify-between rounded px-2 py-1.5 text-xs ${
                      hasLink
                        ? "bg-green-50 border border-green-200"
                        : isActive
                          ? "bg-amber-50 border border-amber-200"
                          : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {l.tag && (
                        <span
                          className="inline-block w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: l.tagColor || "#6b7280" }}
                        />
                      )}
                      <span className="font-medium truncate">{l.subject}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 text-gray-500">
                      <span>{l.start_time.slice(0, 5)}</span>
                      {l.notes && <span title="יש הערות">📝</span>}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export { DAYS };
