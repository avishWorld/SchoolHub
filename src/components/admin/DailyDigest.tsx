"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DailyDigest() {
  const [insights, setInsights] = useState<string[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [isLoading, setIsLoading] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

  const fetchDigest = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/daily-digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights || []);
        setAiGenerated(data.ai_generated || false);
      }
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-900">🤖 סיכום יומי AI</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <Button onClick={fetchDigest} disabled={isLoading}>
          {isLoading ? "מנתח..." : "🔄 צור סיכום"}
        </Button>
      </div>

      {insights.length > 0 && (
        <Card className={aiGenerated ? "border-2 border-purple-300 bg-purple-50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              {aiGenerated ? "🤖 תובנות AI" : "📊 סיכום נתונים"}
              {aiGenerated && <span className="text-xs bg-purple-200 text-purple-700 rounded-full px-2 py-0.5">Sonnet</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.map((insight, i) => (
                <li key={i} className="text-sm leading-relaxed">{insight}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {insights.length === 0 && !isLoading && (
        <p className="text-center text-gray-400 py-8">לחץ &quot;צור סיכום&quot; לקבלת תובנות</p>
      )}
    </div>
  );
}
