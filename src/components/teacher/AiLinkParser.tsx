"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ParsedResult {
  url: string | null;
  platform: string | null;
  date: string | null;
  time: string | null;
  confidence: number;
  message?: string;
}

interface AiLinkParserProps {
  onLinkParsed: (url: string) => void;
  onClose: () => void;
}

export function AiLinkParser({ onLinkParsed, onClose }: AiLinkParserProps) {
  const [text, setText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [error, setError] = useState("");

  const handleParse = async () => {
    if (!text.trim()) {
      setError("יש להדביק טקסט לניתוח.");
      return;
    }

    setIsParsing(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/ai/parse-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });

      const data: ParsedResult = await res.json();
      setResult(data);

      if (!data.url) {
        setError(data.message || "לא נמצא קישור בטקסט.");
      }
    } catch {
      setError("שגיאת תקשורת. נסה להזין קישור ידנית.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirm = () => {
    if (result?.url) {
      onLinkParsed(result.url);
    }
  };

  const platformLabels: Record<string, string> = {
    zoom: "Zoom",
    teams: "Microsoft Teams",
    meet: "Google Meet",
    other: "אחר",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">🤖 ניתוח טקסט חכם</CardTitle>
          <Button size="sm" variant="ghost" onClick={onClose}>✕</Button>
        </div>
        <p className="text-sm text-gray-500">
          הדבק הודעת WhatsApp או טקסט עם פרטי שיעור — ה-AI יחלץ את הקישור
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Text input */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"הדבק כאן הודעה, למשל:\nשלום לכולם, השיעור מחר בשעה 8:00\nקישור: https://zoom.us/j/123456"}
          rows={5}
          maxLength={2000}
          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm resize-none focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          autoFocus
        />
        <p className="text-xs text-gray-400 text-left" dir="ltr">
          {text.length}/2000
        </p>

        {/* Parse button */}
        <Button onClick={handleParse} disabled={isParsing || !text.trim()}>
          {isParsing ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⚙️</span> מנתח...
            </span>
          ) : (
            "🔍 נתח טקסט"
          )}
        </Button>

        {/* Error */}
        {error && (
          <div role="alert" className="rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-700">{error}</p>
            <p className="text-xs text-amber-600 mt-1">
              אפשר להזין קישור ידנית במקום.
            </p>
          </div>
        )}

        {/* Result */}
        {result && result.url && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-3">
            <p className="text-sm font-semibold text-green-800">✅ נמצא קישור!</p>
            <div className="space-y-1 text-sm">
              <p>
                <span className="font-medium text-gray-700">קישור: </span>
                <span className="text-blue-600" dir="ltr">{result.url}</span>
              </p>
              {result.platform && (
                <p>
                  <span className="font-medium text-gray-700">פלטפורמה: </span>
                  {platformLabels[result.platform] || result.platform}
                </p>
              )}
              {result.date && (
                <p>
                  <span className="font-medium text-gray-700">תאריך: </span>
                  {result.date}
                </p>
              )}
              {result.time && (
                <p>
                  <span className="font-medium text-gray-700">שעה: </span>
                  {result.time}
                </p>
              )}
              <p className="text-xs text-gray-500">
                ביטחון: {Math.round(result.confidence * 100)}%
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleConfirm}>
                ✓ השתמש בקישור הזה
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setResult(null); setText(""); }}>
                נסה טקסט אחר
              </Button>
            </div>
          </div>
        )}

        {/* Manual fallback */}
        {(error || (result && !result.url)) && (
          <div className="pt-2 border-t">
            <p className="text-sm font-medium text-gray-700 mb-2">
              הזנה ידנית:
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="https://zoom.us/j/..."
                dir="ltr"
                onChange={(e) => {
                  const url = e.target.value.trim();
                  if (url.startsWith("http")) {
                    setResult({ url, platform: null, date: null, time: null, confidence: 1 });
                    setError("");
                  }
                }}
              />
              {result?.url && (
                <Button size="sm" onClick={handleConfirm}>
                  שמור
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
