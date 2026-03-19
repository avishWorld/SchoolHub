"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { StudentSchedule } from "@/components/student/StudentSchedule";
import { Button } from "@/components/ui/button";

const CHILD_COLORS = ["#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

interface Child {
  student_id: string;
  class_id: string;
  name: string;
  class_name: string;
  grade: number;
}

interface ParentDashboardProps {
  userName: string;
  role: string;
}

export function ParentDashboard({ userName, role }: ParentDashboardProps) {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchChildren = useCallback(async () => {
    try {
      const res = await fetch("/api/parent/children");
      if (!res.ok) return;
      const data = await res.json();
      setChildren(data.children || []);

      // Auto-select last viewed or first child
      if (data.children?.length > 0) {
        const lastViewed = data.last_viewed_id;
        const validId = data.children.find(
          (c: Child) => c.student_id === lastViewed
        )
          ? lastViewed
          : data.children[0].student_id;
        setSelectedChildId(validId);
      }
    } catch {
      // Silently fail — will show empty state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  const handleChildSwitch = async (childId: string) => {
    setSelectedChildId(childId);
    // Persist last_viewed (fire-and-forget)
    fetch("/api/parent/children", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: childId }),
    }).catch(() => {});
  };

  const selectedChild = children.find((c) => c.student_id === selectedChildId);

  // Single child → skip picker entirely
  const showPicker = children.length > 1;

  return (
    <DashboardShell
      title="מעקב אחר הילדים"
      userName={userName}
      role={role}
      navItems={[{ label: "מערכת היום", href: "/parent" }]}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">טוען...</p>
        </div>
      ) : children.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-gray-400">
            לא נמצאו ילדים מקושרים לחשבון זה.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Child picker — only shown when multiple children */}
          {showPicker && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="בחירת ילד/ה">
              <Button
                variant={selectedChildId === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedChildId("all")}
                aria-pressed={selectedChildId === "all"}
              >
                👨‍👩‍👧‍👦 כל הילדים
              </Button>
              {children.map((child, idx) => (
                <Button
                  key={child.student_id}
                  variant={
                    child.student_id === selectedChildId
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => handleChildSwitch(child.student_id)}
                  aria-pressed={child.student_id === selectedChildId}
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full ml-1"
                    style={{ backgroundColor: CHILD_COLORS[idx % CHILD_COLORS.length] }}
                  />
                  {child.name}
                  <span className="mr-1 text-xs opacity-70">
                    ({child.class_name})
                  </span>
                </Button>
              ))}
            </div>
          )}

          {/* Selected child header (for single child) */}
          {!showPicker && selectedChild && selectedChildId !== "all" && (
            <div className="text-center">
              <p className="text-sm text-gray-500">
                {selectedChild.name} · {selectedChild.class_name}
              </p>
            </div>
          )}

          {/* All children view — stacked schedules with color tags */}
          {selectedChildId === "all" ? (
            <div className="space-y-6">
              {children.map((child, idx) => (
                <div key={child.student_id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="inline-block w-3 h-3 rounded-full"
                      style={{ backgroundColor: CHILD_COLORS[idx % CHILD_COLORS.length] }}
                    />
                    <h3 className="font-semibold text-gray-900">{child.name}</h3>
                    <span className="text-sm text-gray-500">({child.class_name})</span>
                  </div>
                  <StudentSchedule
                    key={child.student_id}
                    classId={child.class_id}
                    childTag={child.name}
                    childColor={CHILD_COLORS[idx % CHILD_COLORS.length]}
                  />
                </div>
              ))}
            </div>
          ) : selectedChild ? (
            <StudentSchedule
              key={selectedChild.student_id}
              classId={selectedChild.class_id}
            />
          ) : null}
        </div>
      )}
    </DashboardShell>
  );
}
