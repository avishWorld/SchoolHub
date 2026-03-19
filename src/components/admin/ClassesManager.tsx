"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ClassItem {
  id: string;
  name: string;
  grade: number;
}

export function ClassesManager() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formGrade, setFormGrade] = useState(7);
  const [isSaving, setIsSaving] = useState(false);

  const loadClasses = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/classes");
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
      }
    } catch {
      setError("שגיאה בטעינה.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const handleSave = async () => {
    if (!formName.trim()) {
      setError("יש להזין שם כיתה.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/classes", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId
            ? { id: editingId, name: formName.trim(), grade: formGrade }
            : { name: formName.trim(), grade: formGrade }
        ),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "שגיאה.");
        return;
      }
      setShowForm(false);
      setEditingId(null);
      setFormName("");
      await loadClasses();
    } catch {
      setError("שגיאת תקשורת.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError("");
    try {
      await fetch("/api/admin/classes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await loadClasses();
    } catch {
      setError("שגיאה במחיקה.");
    }
  };

  if (isLoading) {
    return <p className="text-center text-gray-500 py-12">טוען...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">ניהול כיתות</h2>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormName("");
            setFormGrade(7);
          }}
        >
          + כיתה חדשה
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "עריכת כיתה" : "כיתה חדשה"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="class-name" className="text-sm font-medium text-gray-700">שם</label>
                <Input
                  id="class-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="ז׳1"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="class-grade" className="text-sm font-medium text-gray-700">שכבה</label>
                <Input
                  id="class-grade"
                  type="number"
                  min={1}
                  max={12}
                  value={formGrade}
                  onChange={(e) => setFormGrade(parseInt(e.target.value) || 7)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "שומר..." : "שמור"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setError(""); }}>
                ביטול
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((cls) => (
          <Card key={cls.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{cls.name}</p>
                <p className="text-sm text-gray-500">שכבה {cls.grade}</p>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(cls.id);
                    setFormName(cls.name);
                    setFormGrade(cls.grade);
                    setShowForm(true);
                  }}
                  aria-label={`ערוך ${cls.name}`}
                >
                  ✏️
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(cls.id)}
                  aria-label={`מחק ${cls.name}`}
                >
                  🗑️
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {classes.length === 0 && (
          <p className="text-center text-gray-400 col-span-full py-8">אין כיתות</p>
        )}
      </div>
    </div>
  );
}
