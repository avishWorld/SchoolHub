"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface ClassStatus {
  class_id: string;
  class_name: string;
  grade: number;
  status: "green" | "yellow" | "red" | "gray";
  current_lesson: {
    subject: string;
    teacher_name: string;
    start_time: string;
    has_link: boolean;
  } | null;
  today_lessons: number;
  missing_links: number;
  join_count: number;
}

const STATUS_STYLES: Record<string, string> = {
  green: "border-green-400 bg-green-50",
  yellow: "border-amber-400 bg-amber-50",
  red: "border-red-400 bg-red-50",
  gray: "border-gray-200 bg-gray-50",
};

const STATUS_DOTS: Record<string, string> = {
  green: "bg-green-500 animate-pulse",
  yellow: "bg-amber-500",
  red: "bg-red-500 animate-pulse",
  gray: "bg-gray-300",
};

const STATUS_LABELS: Record<string, string> = {
  green: "פעיל עם קישור",
  yellow: "חסר קישור",
  red: "שיעור ללא קישור!",
  gray: "אין שיעורים היום",
};

const REFRESH_INTERVAL = 30000; // 30 seconds

export function DashboardOverview() {
  const [classes, setClasses] = useState<ClassStatus[]>([]);
  const [date, setDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<ClassStatus | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/overview");
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
        setDate(data.date || "");
      }
    } catch {
      // Silent retry on next interval
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchOverview]);

  // Summary counts
  const greenCount = classes.filter((c) => c.status === "green").length;
  const yellowCount = classes.filter((c) => c.status === "yellow").length;
  const redCount = classes.filter((c) => c.status === "red").length;
  const totalJoins = classes.reduce((sum, c) => sum + c.join_count, 0);

  if (isLoading) {
    return <p className="text-center text-gray-500 py-12">טוען סטטוס...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="תקין" count={greenCount} color="text-green-600 bg-green-50" />
        <SummaryCard label="חסר קישור" count={yellowCount} color="text-amber-600 bg-amber-50" />
        <SummaryCard label="בעיה!" count={redCount} color="text-red-600 bg-red-50" />
        <SummaryCard label="הצטרפויות היום" count={totalJoins} color="text-blue-600 bg-blue-50" />
      </div>

      {/* Class grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((cls) => (
          <Card
            key={cls.class_id}
            className={`border-2 cursor-pointer transition-all hover:shadow-md ${STATUS_STYLES[cls.status]}`}
            onClick={() => setSelectedClass(selectedClass?.class_id === cls.class_id ? null : cls)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${STATUS_DOTS[cls.status]}`} />
                    <p className="font-bold text-gray-900">{cls.class_name}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">שכבה {cls.grade}</p>
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-500">{STATUS_LABELS[cls.status]}</p>
                </div>
              </div>

              {cls.current_lesson && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm font-medium">{cls.current_lesson.subject}</p>
                  <p className="text-xs text-gray-500">
                    {cls.current_lesson.start_time.slice(0, 5)} · {cls.current_lesson.teacher_name}
                  </p>
                </div>
              )}

              <div className="flex justify-between mt-2 text-xs text-gray-400">
                <span>{cls.today_lessons} שיעורים</span>
                {cls.missing_links > 0 && (
                  <span className="text-amber-600">{cls.missing_links} חסרי קישור</span>
                )}
                {cls.join_count > 0 && (
                  <span className="text-blue-600">{cls.join_count} הצטרפויות</span>
                )}
              </div>

              {/* Expanded detail */}
              {selectedClass?.class_id === cls.class_id && (
                <div className="mt-3 pt-3 border-t text-sm space-y-1">
                  <p><strong>שיעורים היום:</strong> {cls.today_lessons}</p>
                  <p><strong>קישורים חסרים:</strong> {cls.missing_links}</p>
                  <p><strong>תלמידים שהצטרפו:</strong> {cls.join_count}</p>
                  {cls.current_lesson && (
                    <>
                      <p><strong>מקצוע נוכחי:</strong> {cls.current_lesson.subject}</p>
                      <p><strong>מורה:</strong> {cls.current_lesson.teacher_name}</p>
                      <p><strong>קישור:</strong> {cls.current_lesson.has_link ? "✅ קיים" : "❌ חסר"}</p>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Date + refresh indicator */}
      <p className="text-xs text-center text-gray-400">
        {date} · מתעדכן כל 30 שניות
      </p>
    </div>
  );
}

function SummaryCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`rounded-lg p-3 text-center ${color}`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs">{label}</p>
    </div>
  );
}
