"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Resource {
  url: string;
  label: string;
}

interface LessonContentEditorProps {
  instanceId: string;
  subject: string;
  onClose: () => void;
  onSaved: () => void;
}

export function LessonContentEditor({
  instanceId,
  subject,
  onClose,
  onSaved,
}: LessonContentEditorProps) {
  const [notes, setNotes] = useState("");
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Load existing content
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/lessons/${instanceId}/content`);
        if (res.ok) {
          const data = await res.json();
          setNotes(data.lesson.notes || "");
          setResources(data.lesson.resources || []);
        }
      } catch {
        // Start empty
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [instanceId]);

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/lessons/${instanceId}/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes.trim() || null, resources }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "שגיאה בשמירה.");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("שגיאת תקשורת.");
    } finally {
      setIsSaving(false);
    }
  };

  const addResource = () => {
    if (resources.length >= 5) return;
    setResources([...resources, { url: "", label: "" }]);
  };

  const removeResource = (index: number) => {
    setResources(resources.filter((_, i) => i !== index));
  };

  const updateResource = (index: number, field: "url" | "label", value: string) => {
    const updated = [...resources];
    updated[index] = { ...updated[index], [field]: value };
    setResources(updated);
  };

  if (isLoading) {
    return <p className="text-center text-gray-500 py-4">טוען...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">📝 תוכן שיעור — {subject}</CardTitle>
          <Button size="sm" variant="ghost" onClick={onClose}>✕</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Notes */}
        <div className="space-y-1">
          <label htmlFor="lesson-notes" className="text-sm font-medium text-gray-700">
            הערות / שיעורי בית
          </label>
          <textarea
            id="lesson-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="הערות למורה, שיעורי בית, הנחיות..."
            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm resize-none focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <p className="text-xs text-gray-400 text-left" dir="ltr">{notes.length}/500</p>
        </div>

        {/* Resources */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              קישורים חיצוניים ({resources.length}/5)
            </label>
            {resources.length < 5 && (
              <Button size="sm" variant="outline" onClick={addResource}>
                + קישור
              </Button>
            )}
          </div>

          {resources.map((r, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1">
                <Input
                  value={r.label}
                  onChange={(e) => updateResource(i, "label", e.target.value)}
                  placeholder="תיאור (למשל: דף עבודה)"
                />
                <Input
                  value={r.url}
                  onChange={(e) => updateResource(i, "url", e.target.value)}
                  placeholder="https://..."
                  dir="ltr"
                />
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeResource(i)}
                className="mt-1"
              >
                🗑️
              </Button>
            </div>
          ))}

          {resources.length === 0 && (
            <p className="text-xs text-gray-400">אין קישורים חיצוניים. לחץ &quot;+ קישור&quot; להוספה.</p>
          )}
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "שומר..." : "💾 שמור"}
          </Button>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
        </div>
      </CardContent>
    </Card>
  );
}
