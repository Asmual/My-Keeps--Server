import { Resend } from 'resend';
import nodemailer, { Transporter } from 'nodemailer';

interface SendReminderOptions {
  to: string;
  recipientName?: string;
  noteTitle: string;
  noteContent?: string;
  checklist?: Array<{ text: string; completed: boolean }>;
  reminderTime: Date | string;
  noteId: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Global cached transports
let resendClient: Resend | null = null;
let nodemailerTransport: Transporter | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function getNodemailerTransport(): Transporter | null {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!user || !pass) return null;

  if (!nodemailerTransport) {
    nodemailerTransport = nodemailer.createTransport({
      service: process.env.SMTP_SERVICE || 'gmail',
      host: process.env.SMTP_HOST || undefined,
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
    });
  }
  return nodemailerTransport;
}

/**
 * Generate a responsive HTML template matching My Keeps brand identity
 */
function buildReminderHtml({
  recipientName,
  noteTitle,
  noteContent,
  checklist,
  reminderTime,
  appUrl,
}: {
  recipientName?: string;
  noteTitle: string;
  noteContent?: string;
  checklist?: Array<{ text: string; completed: boolean }>;
  reminderTime: Date | string;
  appUrl: string;
}): string {
  const formattedTime = new Date(reminderTime).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const contentSnippet = noteContent
    ? noteContent.replace(/\n/g, '<br/>')
    : '<em>No additional text details</em>';

  const checklistHtml =
    checklist && checklist.length > 0
      ? `
        <div style="margin-top: 18px; padding-top: 14px; border-top: 1px solid #e2e8f0;">
          <strong style="font-size: 13px; color: #023859; text-transform: uppercase; letter-spacing: 0.5px;">Checklist (${
            checklist.filter((c) => c.completed).length
          }/${checklist.length} completed):</strong>
          <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #334155; font-size: 14px; line-height: 1.6;">
            ${checklist
              .map(
                (item) =>
                  `<li style="${
                    item.completed ? 'text-decoration: line-through; color: #94a3b8;' : ''
                  }">${item.text}</li>`
              )
              .join('')}
          </ul>
        </div>
      `
      : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Note Reminder: ${noteTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(1, 28, 64, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #011C40 0%, #023859 100%); padding: 28px 32px; text-align: left;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; background-color: rgba(167, 235, 242, 0.2); color: #A7EBF2; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px; text-transform: uppercase;">
                      🔔 Scheduled Reminder
                    </span>
                    <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 12px 0 0 0;">
                      My Keeps
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px; text-align: left;">
              <p style="font-size: 15px; color: #475569; margin: 0 0 20px 0;">
                Hello${recipientName ? ` <strong>${recipientName}</strong>` : ''}, this is your scheduled reminder:
              </p>

              <!-- Note Container -->
              <div style="background-color: #f8fafc; border-left: 4px solid #54ACBF; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #011C40; font-weight: 700;">
                  ${noteTitle || 'Untitled Note'}
                </h2>
                
                <div style="color: #334155; font-size: 14px; line-height: 1.6;">
                  ${contentSnippet}
                </div>

                ${checklistHtml}
              </div>

              <!-- Time Badge -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td style="font-size: 13px; color: #64748b;">
                    ⏰ <strong>Reminder Time:</strong> ${formattedTime}
                  </td>
                </tr>
              </table>

              <!-- Call to action button -->
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="border-radius: 10px; background-color: #023859;">
                    <a href="${appUrl}/reminders" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 10px; background-color: #023859;">
                      Open Note in My Keeps &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
              You received this automated notification because a reminder was scheduled on <a href="${appUrl}" style="color: #54ACBF; text-decoration: none;">My Keeps</a>.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Sends a reminder email via Resend or Nodemailer (Gmail SMTP fallback)
 */
export async function sendReminderEmail(options: SendReminderOptions): Promise<SendEmailResult> {
  const { to, recipientName, noteTitle, noteContent, checklist, reminderTime, noteId } = options;
  const appUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const subject = `🔔 Reminder: ${noteTitle || 'Your Note'}`;
  const html = buildReminderHtml({
    recipientName,
    noteTitle,
    noteContent,
    checklist,
    reminderTime,
    appUrl,
  });

  // 1. Try Resend (If RESEND_API_KEY is configured)
  const resend = getResendClient();
  if (resend) {
    try {
      const from = process.env.EMAIL_FROM || 'My Keeps <onboarding@resend.dev>';
      const res = await resend.emails.send({
        from,
        to,
        subject,
        html,
      });

      if (res.error) {
        console.error('[EmailService] Resend delivery error:', res.error);
        return { success: false, error: res.error.message };
      }

      console.log(`[EmailService] ✅ Email sent via Resend to ${to} (Message ID: ${res.data?.id})`);
      return { success: true, messageId: res.data?.id };
    } catch (err) {
      console.error('[EmailService] Unexpected error sending via Resend:', err);
      // Fall through to try Nodemailer if configured
    }
  }

  // 2. Try Nodemailer SMTP (If SMTP_USER and SMTP_PASS are configured)
  const smtp = getNodemailerTransport();
  if (smtp) {
    try {
      const from = process.env.EMAIL_FROM || `"My Keeps" <${process.env.SMTP_USER}>`;
      const info = await smtp.sendMail({
        from,
        to,
        subject,
        html,
      });

      console.log(`[EmailService] ✅ Email sent via SMTP to ${to} (Message ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('[EmailService] Error sending via SMTP:', err);
      return { success: false, error: (err as Error).message };
    }
  }

  // 3. Neither provider configured
  console.warn(
    `[EmailService] ⚠️ Cannot send reminder to ${to}: Neither RESEND_API_KEY nor (SMTP_USER & SMTP_PASS) is configured in environment variables.`
  );
  return {
    success: false,
    error: 'No email service configured (missing RESEND_API_KEY or SMTP credentials)',
  };
}
