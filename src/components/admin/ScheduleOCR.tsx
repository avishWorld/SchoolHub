"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OCRLesson {
  subject: string;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  teacher_name: string | null;
}

const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

interface ScheduleOCRProps {
  classId: string;
  onDone: () => void;
}

export function ScheduleOCR({ classId, onDone }: ScheduleOCRProps) {
  const [lessons, setLessons] = useState<OCRLesson[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setIsAnalyzing(true);
    setError("");
    setLessons([]);

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Send to OCR API
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/ai/ocr-schedule", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else if (data.schedule?.length > 0) {
        setLessons(data.schedule);
      } else {
        setError("לא נמצאו שיעורים בתמונה.");
      }
    } catch {
      setError("שגיאה בשליחת התמונה.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setError("");
    let saved = 0;

    for (const lesson of lessons) {
      try {
        const res = await fetch("/api/schedule/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            class_id: classId,
            teacher_id: "", // Will need to be filled manually
            subject: lesson.subject,
            day_of_week: lesson.day_of_week,
            start_time: lesson.start_time,
            duration_minutes: lesson.duration_minutes,
          }),
        });
        if (res.ok) saved++;
      } catch { /* continue */ }
    }

    setIsSaving(false);
    if (saved > 0) {
      onDone();
    } else {
      setError("שגיאה בשמירת השיעורים.");
    }
  };

  const removeLesson = (index: number) => {
    setLessons(lessons.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">📸 ייבוא מערכת מתמונה (AI OCR)</CardTitle>
        <p className="text-sm text-gray-500">צלם תמונה של מערכת שעות → AI יחלץ את השיעורים</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          {preview ? (
            <img src={preview} alt="תצוגה מקדימה" className="max-h-48 mx-auto rounded" />
          ) : (
            <div>
              <p className="text-lg text-gray-400">📤 לחץ לבחירת תמונה</p>
              <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP</p>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
        </div>

        {isAnalyzing && (
          <p className="text-center text-blue-600 animate-pulse">🤖 מנתח תמונה...</p>
        )}

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {/* Results table */}
        {lessons.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">נמצאו {lessons.length} שיעורים:</h3>
            <div className="space-y-2">
              {lessons.map((l, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border bg-gray-50 p-3 text-sm">
                  <div>
                    <p className="font-medium">{l.subject}</p>
                    <p className="text-xs text-gray-500">
                      יום {DAY_NAMES[l.day_of_week]} · {l.start_time} · {l.duration_minutes} דק׳
                      {l.teacher_name && ` · ${l.teacher_name}`}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeLesson(i)}>✕</Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveAll} disabled={isSaving}>
                {isSaving ? "שומר..." : `💾 שמור ${lessons.length} שיעורים`}
              </Button>
              <Button variant="outline" onClick={() => { setLessons([]); setPreview(null); }}>
                ביטול
              </Button>
            </div>
            <p className="text-xs text-amber-600">⚠️ יש לבחור מורה לכל שיעור ידנית לאחר השמירה</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
