import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const VALID_URL_PATTERNS = [
  /^https:\/\/[\w.-]*zoom\.us\//,
  /^https:\/\/[\w.-]*teams\.microsoft\.com\//,
  /^https:\/\/meet\.google\.com\//,
];

function isValidMeetingUrl(url: string): boolean {
  return VALID_URL_PATTERNS.some((p) => p.test(url));
}

/**
 * POST /api/lessons/:id/link
 *
 * Add/update meeting URL on a lesson instance.
 * Body: { meeting_url: string }
 *
 * Also supports setting recurring link on the template:
 * Body: { meeting_url: string, set_recurring: true }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const instanceId = params.id;
  const role = request.headers.get("x-user-role");
  if (role !== "teacher" && role !== "admin") {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  let body: { meeting_url: string; set_recurring?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף בקשה לא תקין." }, { status: 400 });
  }

  if (!body.meeting_url?.trim()) {
    return NextResponse.json({ error: "חסר קישור." }, { status: 400 });
  }

  const url = body.meeting_url.trim();
  if (!isValidMeetingUrl(url)) {
    return NextResponse.json(
      { error: "קישור לא תקין. נדרש קישור Zoom, Teams או Google Meet." },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Update instance
  const { data: instance, error: updateError } = await supabase
    .from("lesson_instance")
    .update({ meeting_url: url } as never)
    .eq("id", instanceId)
    .select("id, template_id, meeting_url")
    .single();

  if (updateError || !instance) {
    console.error("Error updating lesson link:", updateError);
    return NextResponse.json({ error: "שגיאה בעדכון קישור." }, { status: 500 });
  }

  // If set_recurring, also update the template
  if (body.set_recurring) {
    const templateId = (instance as { template_id: string }).template_id;
    await supabase
      .from("lesson_template")
      .update({ meeting_url: url, is_recurring_link: true } as never)
      .eq("id", templateId);
  }

  return NextResponse.json({ instance });
}
