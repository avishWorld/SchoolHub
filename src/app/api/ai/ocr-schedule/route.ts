import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

/**
 * POST /api/ai/ocr-schedule
 *
 * Upload an image of a school schedule → Claude Vision extracts structured data.
 * Body: FormData with 'image' file
 * Returns: { schedule: [{ subject, day_of_week, start_time, duration_minutes, teacher_name }] }
 */
export async function POST(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  if (role !== "teacher" && role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "מפתח API לא מוגדר." }, { status: 500 });
  }

  // Parse form data
  let imageData: string;
  let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;
    if (!file) {
      return NextResponse.json({ error: "חסר קובץ תמונה." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    imageData = buffer.toString("base64");

    const type = file.type as string;
    if (type.includes("jpeg") || type.includes("jpg")) mediaType = "image/jpeg";
    else if (type.includes("png")) mediaType = "image/png";
    else if (type.includes("gif")) mediaType = "image/gif";
    else if (type.includes("webp")) mediaType = "image/webp";
    else {
      return NextResponse.json({ error: "פורמט תמונה לא נתמך. השתמש ב-JPEG, PNG, GIF או WebP." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "שגיאה בקריאת התמונה." }, { status: 400 });
  }

  const prompt = `אתה מנתח תמונה של מערכת שעות בית ספרית ישראלית (בעברית).
חלץ מהתמונה את כל השיעורים בפורמט JSON.
כל שיעור צריך להכיל:
- subject: שם המקצוע (עברית)
- day_of_week: מספר (0=ראשון, 1=שני, 2=שלישי, 3=רביעי, 4=חמישי, 5=שישי)
- start_time: שעת התחלה בפורמט "HH:MM"
- duration_minutes: משך בדקות (ברירת מחדל 45 אם לא מצוין)
- teacher_name: שם המורה (אם מוזכר, אחרת null)

החזר JSON בפורמט: {"schedule": [...]}
אם אין מערכת שעות בתמונה, החזר: {"schedule": [], "error": "לא זוהתה מערכת שעות"}`;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageData } },
          { type: "text", text: prompt },
        ],
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";

    // Extract JSON from response (might be wrapped in markdown code block)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ schedule: [], error: "לא הצלחתי לפרש את התמונה." });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("[OCR] Error:", error);
    return NextResponse.json({ schedule: [], error: "שגיאה בניתוח התמונה." });
  }
}
