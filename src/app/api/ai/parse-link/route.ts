import { NextRequest, NextResponse } from "next/server";
import { parseTextForMeetingLink } from "@/lib/claude";

/**
 * POST /api/ai/parse-link
 *
 * Parse free text for meeting link info using Claude AI.
 * Body: { text: string }
 * Returns: { url, platform, date, time, confidence } or { error }
 *
 * Cached: same text → same result (1 hour TTL).
 * Rate limited: requires auth. Max 2000 chars.
 * Timeout: 5 seconds (Claude Haiku is fast).
 */
export async function POST(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  if (role !== "teacher" && role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  let body: { text: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף בקשה לא תקין." }, { status: 400 });
  }

  if (!body.text?.trim()) {
    return NextResponse.json({ error: "חסר טקסט לניתוח." }, { status: 400 });
  }

  if (body.text.length > 2000) {
    return NextResponse.json(
      { error: "הטקסט ארוך מדי. מקסימום 2000 תווים." },
      { status: 400 }
    );
  }

  // Call Claude with timeout
  const timeoutMs = 10000; // 10 seconds (Haiku is usually <3s)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await parseTextForMeetingLink(body.text);

    clearTimeout(timeout);

    if (!result) {
      return NextResponse.json({
        url: null,
        platform: null,
        date: null,
        time: null,
        confidence: 0,
        message: "לא הצלחתי לנתח את הטקסט. נסה להזין קישור ידנית.",
      });
    }

    return NextResponse.json(result);
  } catch {
    clearTimeout(timeout);
    return NextResponse.json({
      url: null,
      platform: null,
      date: null,
      time: null,
      confidence: 0,
      message: "שגיאה בניתוח. נסה להזין קישור ידנית.",
    });
  }
}
