/**
 * Email service for SchoolHub.
 *
 * Uses Resend for sending emails (free tier: 100 emails/day).
 * Falls back to console.log if RESEND_API_KEY is not set.
 */

import { Resend } from "resend";

const FROM_EMAIL = "SchoolHub <noreply@schoolhub.app>";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email via Resend, or log to console as fallback.
 * Returns true if sent (or logged), false on error.
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Fallback: log to console
    console.log(`[EMAIL] To: ${to}`);
    console.log(`[EMAIL] Subject: ${subject}`);
    console.log(`[EMAIL] HTML length: ${html.length} chars`);
    return true;
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("[EMAIL] Send error:", error);
    return false;
  }
}
