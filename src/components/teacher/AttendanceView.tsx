"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AttendanceRecord {
  student_id: string;
  student_name: string;
  attendance_id: string | null;
  join_clicked_at: string | null;
  status: "unknown" | "present" | "absent" | "late";
  confirmed_by: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  unknown: "לא ידוע",
  present: "נוכח/ת",
  absent: "נעדר/ת",
  late: "באיחור",
};

const STATUS_COLORS: Record<string, string> = {
  unknown: "bg-gray-100 text-gray-600",
  present: "bg-green-100 text-green-700",
  absent: "bg-red-100 text-red-700",
  late: "bg-amber-100 text-amber-700",
};

interface AttendanceViewProps {
  instanceId: string;
  subject: string;
  onClose: () => void;
}

export function AttendanceView({ instanceId, subject, onClose }: AttendanceViewProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadAttendance = useCallback(async () => {
    try {
      const res = await fetch(`/api/attendance/${instanceId}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.attendance || []);
      } else {
        setError("שגיאה בטעינת נוכחות.");
      }
    } catch {
      setError("שגיאת תקשורת.");
    } finally {
      setIsLoading(false);
    }
  }, [instanceId]);

  // Load on mount
  useState(() => { loadAttendance(); });

  const handleConfirm = async (studentId: string, status: "present" | "absent" | "late") => {
    setUpdatingId(studentId);
    try {
      const res = await fetch(`/api/attendance/${instanceId}/confirm`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, status }),
      });
      if (res.ok) {
        await loadAttendance();
      }
    } catch {
      setError("שגיאה בעדכון.");
    } finally {
      setUpdatingId(null);
    }
  };

  const joinedCount = records.filter((r) => r.join_clicked_at).length;
  const confirmedCount = records.filter((r) => r.status !== "unknown").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>נוכחות — {subject}</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {joinedCount} לחצו הצטרף · {confirmedCount} אושרו · {records.length} סה״כ
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={onClose}>✕ סגור</Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-gray-500 py-4">טוען...</p>
        ) : error ? (
          <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        ) : records.length === 0 ? (
          <p className="text-center text-gray-400 py-4">אין תלמידים בכיתה</p>
        ) : (
          <div className="space-y-2">
            {records.map((r) => (
              <div
                key={r.student_id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  {/* Join indicator */}
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      r.join_clicked_at ? "bg-green-500" : "bg-gray-300"
                    }`}
                    title={r.join_clicked_at ? `לחץ הצטרף: ${new Date(r.join_clicked_at).toLocaleTimeString("he-IL")}` : "לא לחץ"}
                  />
                  <div>
                    <p className="font-medium text-gray-900">{r.student_name}</p>
                    <p className="text-xs text-gray-500">
                      {r.join_clicked_at
                        ? `לחץ הצטרף ב-${new Date(r.join_clicked_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`
                        : "לא לחץ הצטרף"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Current status badge */}
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[r.status]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>

                  {/* Action buttons */}
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={r.status === "present" ? "default" : "outline"}
                      onClick={() => handleConfirm(r.student_id, "present")}
                      disabled={updatingId === r.student_id}
                      className="text-xs h-7 px-2"
                    >
                      ✓
                    </Button>
                    <Button
                      size="sm"
                      variant={r.status === "absent" ? "destructive" : "outline"}
                      onClick={() => handleConfirm(r.student_id, "absent")}
                      disabled={updatingId === r.student_id}
                      className="text-xs h-7 px-2"
                    >
                      ✗
                    </Button>
                    <Button
                      size="sm"
                      variant={r.status === "late" ? "secondary" : "outline"}
                      onClick={() => handleConfirm(r.student_id, "late")}
                      disabled={updatingId === r.student_id}
                      className="text-xs h-7 px-2"
                    >
                      ⏰
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
