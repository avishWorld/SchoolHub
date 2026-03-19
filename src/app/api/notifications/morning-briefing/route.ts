import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { formatDate } from "@/lib/schedule";
import type { User, ParentStudent, Student, LessonTemplate, LessonInstance, Class } from "@/types/database";

/**
 * POST /api/notifications/morning-briefing
 *
 * Generates morning briefing emails for all parents with email + notifications enabled.
 * Called by a cron job (or manually) at 7:30 AM.
 *
 * For MVP: logs the email content to console instead of sending via SMTP.
 * To enable real email: integrate Resend/SendGrid and replace console.log.
 */

interface ChildSchedule {
  child_name: string;
  class_name: string;
  lessons: {
    time: string;
    subject: string;
    teacher: string;
    has_link: boolean;
  }[];
}

interface BriefingEmail {
  parent_name: string;
  parent_email: string;
  parent_id: string;
  children: ChildSchedule[];
}

export async function POST(request: NextRequest) {
  // Simple auth: check for a secret header or admin role
  const role = request.headers.get("x-user-role");
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  const isAuthorized =
    role === "admin" ||
    (cronSecret && authHeader === `Bearer ${cronSecret}`);

  if (!isAuthorized) {
    return NextResponse.json({ error: "אין הרשאה." }, { status: 403 });
  }

  const supabase = createServerClient();
  const today = formatDate(new Date());

  // Get all parents with email + notifications enabled
  const { data: parents } = await supabase
    .from("user")
    .select()
    .eq("role", "parent")
    .eq("is_active", true)
    .eq("email_notifications", true)
    .not("email", "is", null);

  if (!parents || parents.length === 0) {
    return NextResponse.json({ sent: 0, message: "אין הורים עם אימייל פעיל." });
  }

  const parentList = parents as User[];

  // Get all parent-student links
  const parentIds = parentList.map((p) => p.id);
  const { data: links } = await supabase
    .from("parent_student")
    .select()
    .in("parent_id", parentIds);

  const parentLinks = (links as ParentStudent[]) || [];

  // Get all students
  const studentIds = Array.from(new Set(parentLinks.map((l) => l.student_id)));
  if (studentIds.length === 0) {
    return NextResponse.json({ sent: 0, message: "אין תלמידים מקושרים." });
  }

  const { data: students } = await supabase.from("student").select().in("id", studentIds);
  const studentList = (students as Student[]) || [];

  // Get student user names
  const studentUserIds = studentList.map((s) => s.user_id);
  const { data: studentUsers } = await supabase
    .from("user")
    .select("id, name")
    .in("id", studentUserIds);
  const studentNameMap = new Map(
    ((studentUsers as { id: string; name: string }[]) || []).map((u) => [u.id, u.name])
  );

  // Get classes
  const classIds = Array.from(new Set(studentList.map((s) => s.class_id)));
  const { data: classData } = await supabase.from("class").select().in("id", classIds);
  const classMap = new Map(((classData as Class[]) || []).map((c) => [c.id, c]));

  // Get templates for today's day of week
  const { data: allTemplates } = await supabase
    .from("lesson_template")
    .select()
    .in("class_id", classIds);
  const templateList = (allTemplates as LessonTemplate[]) || [];

  // Get today's instances
  const templateIds = templateList.map((t) => t.id);
  let instanceList: LessonInstance[] = [];
  if (templateIds.length > 0) {
    const { data: instances } = await supabase
      .from("lesson_instance")
      .select()
      .in("template_id", templateIds)
      .eq("date", today);
    instanceList = (instances as LessonInstance[]) || [];
  }

  // Get teacher names
  const teacherIds = Array.from(new Set(templateList.map((t) => t.teacher_id)));
  let teacherMap = new Map<string, string>();
  if (teacherIds.length > 0) {
    const { data: teachers } = await supabase
      .from("user")
      .select("id, name")
      .in("id", teacherIds);
    teacherMap = new Map(
      ((teachers as { id: string; name: string }[]) || []).map((t) => [t.id, t.name])
    );
  }

  // Build briefing per parent
  const briefings: BriefingEmail[] = [];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  for (const parent of parentList) {
    const childLinks = parentLinks.filter((l) => l.parent_id === parent.id);
    const children: ChildSchedule[] = [];

    for (const link of childLinks) {
      const student = studentList.find((s) => s.id === link.student_id);
      if (!student) continue;

      const cls = classMap.get(student.class_id);
      const childTemplates = templateList.filter((t) => t.class_id === student.class_id);
      const childInstances = instanceList.filter((i) =>
        childTemplates.some((t) => t.id === i.template_id)
      );

      const lessons = childInstances.map((inst) => {
        const tmpl = childTemplates.find((t) => t.id === inst.template_id);
        return {
          time: tmpl?.start_time?.slice(0, 5) || "—",
          subject: tmpl?.subject || "—",
          teacher: tmpl ? (teacherMap.get(tmpl.teacher_id) || "—") : "—",
          has_link: !!(inst.meeting_url || tmpl?.meeting_url),
        };
      }).sort((a, b) => a.time.localeCompare(b.time));

      children.push({
        child_name: studentNameMap.get(student.user_id) || "—",
        class_name: cls?.name || "—",
        lessons,
      });
    }

    if (children.length > 0 && children.some((c) => c.lessons.length > 0)) {
      briefings.push({
        parent_name: parent.name,
        parent_email: parent.email!,
        parent_id: parent.id,
        children,
      });
    }
  }

  // Send emails via Resend (or log to console as fallback)
  const { sendEmail } = await import("@/lib/email");
  let sentCount = 0;
  for (const briefing of briefings) {
    const html = generateEmailHtml(briefing, appUrl);
    const sent = await sendEmail({
      to: briefing.parent_email,
      subject: "סיכום בוקר — SchoolHub",
      html,
    });
    if (sent) sentCount++;
  }

  return NextResponse.json({
    sent: sentCount,
    total_parents: parentList.length,
    date: today,
  });
}

function generateEmailHtml(briefing: BriefingEmail, appUrl: string): string {
  const childrenHtml = briefing.children
    .map((child) => {
      const lessonsHtml = child.lessons.length === 0
        ? "<p style='color:#999;'>אין שיעורים היום 🎉</p>"
        : child.lessons
            .map((l) => {
              const icon = l.has_link ? "✅" : "⚠️";
              return `<tr>
                <td style="padding:4px 8px;">${l.time}</td>
                <td style="padding:4px 8px;">${l.subject}</td>
                <td style="padding:4px 8px;">${l.teacher}</td>
                <td style="padding:4px 8px;">${icon}</td>
              </tr>`;
            })
            .join("");

      return `
        <h3 style="margin-top:16px;">${child.child_name} — ${child.class_name}</h3>
        ${child.lessons.length > 0
          ? `<table style="border-collapse:collapse;width:100%;">
              <tr style="background:#f1f5f9;">
                <th style="padding:4px 8px;text-align:right;">שעה</th>
                <th style="padding:4px 8px;text-align:right;">מקצוע</th>
                <th style="padding:4px 8px;text-align:right;">מורה</th>
                <th style="padding:4px 8px;text-align:right;">קישור</th>
              </tr>
              ${lessonsHtml}
            </table>`
          : lessonsHtml
        }`;
    })
    .join("");

  const unsubscribeUrl = `${appUrl}/api/notifications/unsubscribe?user_id=${briefing.parent_id}`;

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
  <h1 style="color:#2563eb;">SchoolHub — סיכום בוקר</h1>
  <p>שלום ${briefing.parent_name},</p>
  <p>הנה המערכת להיום:</p>
  ${childrenHtml}
  <p style="margin-top:20px;">
    <a href="${appUrl}" style="background:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;">
      פתח ב-SchoolHub
    </a>
  </p>
  <hr style="margin-top:30px;border:none;border-top:1px solid #e2e8f0;">
  <p style="font-size:12px;color:#999;">
    <a href="${unsubscribeUrl}">ביטול סיכום בוקר</a>
  </p>
</body>
</html>`;
}
