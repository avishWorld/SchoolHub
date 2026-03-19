"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface AtRiskStudent {
  student_id: string;
  name: string;
  class_name: string;
  total_lessons: number;
  joined: number;
  join_rate: number;
  last_active: string | null;
  severity: "high" | "medium" | "low";
}

const SEVERITY_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-300",
  medium: "bg-amber-100 text-amber-700 border-amber-300",
  low: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

const SEVERITY_LABELS: Record<string, string> = {
  high: "🔴 חמור",
  medium: "🟡 בינוני",
  low: "🟢 קל",
};

export function AtRiskReport() {
  const [students, setStudents] = useState<AtRiskStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/ai/at-risk");
        if (res.ok) {
          const data = await res.json();
          setStudents(data.students || []);
        }
      } catch { /* silent */ }
      finally { setIsLoading(false); }
    }
    load();
  }, []);

  if (isLoading) return <p className="text-center text-gray-500 py-8">טוען...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">⚠️ תלמידים בסיכון</h2>
      <p className="text-sm text-gray-500">תלמידים עם פחות מ-50% השתתפות ב-7 הימים האחרונים</p>

      {students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg text-green-600">✅ אין תלמידים בסיכון כרגע</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {students.map((s) => (
            <Card key={s.student_id} className={`border ${SEVERITY_STYLES[s.severity]}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-gray-600">
                    {s.class_name} · {s.joined}/{s.total_lessons} שיעורים · {s.join_rate}% השתתפות
                  </p>
                  {s.last_active && (
                    <p className="text-xs text-gray-400">פעיל לאחרונה: {s.last_active}</p>
                  )}
                </div>
                <span className="text-sm font-medium">{SEVERITY_LABELS[s.severity]}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
