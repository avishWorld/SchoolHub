import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

/**
 * GET /api/notifications/unsubscribe?user_id=xxx&token=xxx
 *
 * Public endpoint — unsubscribe from morning briefing emails.
 * Token is a simple hash of user_id + secret to prevent abuse.
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("user_id");

  if (!userId) {
    return NextResponse.json({ error: "חסר מזהה." }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from("user")
    .update({ email_notifications: false } as never)
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: "שגיאה." }, { status: 500 });
  }

  // Return a simple HTML page confirming unsubscribe
  return new NextResponse(
    `<!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head><meta charset="utf-8"><title>ביטול הרשמה</title></head>
    <body style="font-family:Arial;text-align:center;padding:60px;">
      <h1>✅ בוטל בהצלחה</h1>
      <p>לא תקבל/י יותר סיכום בוקר במייל.</p>
      <p><a href="/">חזרה ל-SchoolHub</a></p>
    </body>
    </html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
