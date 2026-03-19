import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { formatDate } from "@/lib/schedule";
import Anthropic from "@anthropic-ai/sdk";
import type { Class, LessonTemplate, LessonInstance, Attendance } from "@/types/database";

/**
 * POST /api/ai/daily-digest
 *
 * Generates AI-powered daily insights for admin using Claude Sonnet.
 * Analyzes: attendance trends, missing links, class activity.
 * Body: { date?: string } — defaults to today
 */
export async function POST(request: NextRequest) {
  const role = request.headers.get("x-user-role");
  const schoolId = request.headers.get("x-school-id");
  if (role !== "admin" || !schoolId) {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  let targetDate: string;
  try {
    const body = await request.json();
    targetDate = body.date || formatDate(new Date());
  } catch {
    targetDate = formatDate(new Date());
  }

  const supabase = createServerClient();

  // Gather data
  const { data: classes } = await supabase.from("class").select().eq("school_id", schoolId);
  const classList = (classes as Class[]) || [];
  const classIds = classList.map((c) => c.id);

  let templates: LessonTemplate[] = [];
  let instances: LessonInstance[] = [];
  let attendanceRecords: Attendance[] = [];

  if (classIds.length > 0) {
    const { data: tmpl } = await supabase.from("lesson_template").select().in("class_id", classIds);
    templates = (tmpl as LessonTemplate[]) || [];

    const templateIds = templates.map((t) => t.id);
    if (templateIds.length > 0) {
      const { data: inst } = await supabase.from("lesson_instance").select().in("template_id", templateIds).eq("date", targetDate);
      instances = (inst as LessonInstance[]) || [];

      const instanceIds = instances.map((i) => i.id);
      if (instanceIds.length > 0) {
        const { data: att } = await supabase.from("attendance").select().in("lesson_instance_id", instanceIds);
        attendanceRecords = (att as Attendance[]) || [];
      }
    }
  }

  // Build summary data for Claude
  const totalLessons = instances.length;
  const lessonsWithLinks = instances.filter((i) => {
    const tmpl = templates.find((t) => t.id === i.template_id);
    return i.meeting_url || tmpl?.meeting_url;
  }).length;
  const missingLinks = totalLessons - lessonsWithLinks;
  const totalJoins = attendanceRecords.filter((a) => a.join_clicked_at).length;
  const confirmedPresent = attendanceRecords.filter((a) => a.status === "present").length;

  const classStats = classList.map((cls) => {
    const clsTemplates = templates.filter((t) => t.class_id === cls.id);
    const clsInstances = instances.filter((i) => clsTemplates.some((t) => t.id === i.template_id));
    const clsAttendance = attendanceRecords.filter((a) => clsInstances.some((i) => i.id === a.lesson_instance_id));
    return `${cls.name} (שכבה ${cls.grade}): ${clsInstances.length} שיעורים, ${clsAttendance.filter((a) => a.join_clicked_at).length} הצטרפויות`;
  }).join("\n");

  const prompt = `אתה מנתח נתונים של בית ספר. הנה סיכום היום (${targetDate}):

סה"כ שיעורים: ${totalLessons}
שיעורים עם קישור: ${lessonsWithLinks}
שיעורים בלי קישור: ${missingLinks}
סה"כ לחיצות "הצטרף": ${totalJoins}
נוכחות מאושרת: ${confirmedPresent}

פירוט לפי כיתה:
${classStats || "אין נתונים"}

כתוב סיכום קצר בעברית (3-5 נקודות) עם insights מעניינים, בעיות שצריך לטפל בהן, והמלצות למנהל. השתמש באימוג'ים. פורמט: JSON array של מחרוזות.
דוגמה: ["📊 היום היו 12 שיעורים ב-3 כיתות", "⚠️ 2 שיעורים התחילו בלי קישור"]`;

  // Call Claude Sonnet
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      insights: [`📊 סה"כ ${totalLessons} שיעורים היום`, missingLinks > 0 ? `⚠️ ${missingLinks} שיעורים בלי קישור` : "✅ כל השיעורים עם קישור", `👥 ${totalJoins} הצטרפויות`],
      date: targetDate,
      ai_generated: false,
    });
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "[]";
    let insights: string[];
    try {
      insights = JSON.parse(text);
    } catch {
      insights = [text]; // If not valid JSON, use as single insight
    }

    return NextResponse.json({ insights, date: targetDate, ai_generated: true });
  } catch (error) {
    console.error("[Digest] AI error:", error);
    // Fallback without AI
    return NextResponse.json({
      insights: [`📊 סה"כ ${totalLessons} שיעורים היום`, missingLinks > 0 ? `⚠️ ${missingLinks} שיעורים בלי קישור` : "✅ כל השיעורים עם קישור", `👥 ${totalJoins} הצטרפויות, ${confirmedPresent} אושרו`],
      date: targetDate,
      ai_generated: false,
    });
  }
}
