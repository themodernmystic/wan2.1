import { env } from '../lib/env.js';

export type SendEmailArgs = { to: string; subject: string; body: string; from?: string };

/** Replaces base44.integrations.Core.SendEmail. Uses Resend if configured, else SMTP, else logs (dev). */
export async function sendEmail(args: SendEmailArgs): Promise<{ sent: boolean }> {
  if (env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: args.from || env.SMTP_FROM,
        to: [args.to],
        subject: args.subject,
        html: args.body,
      }),
    });
    if (!res.ok) throw new Error(`SendEmail (Resend) failed: ${res.status} ${await res.text().catch(() => '')}`);
    return { sent: true };
  }

  if (env.SMTP_HOST) {
    const nodemailer = await import('nodemailer');
    const transport = nodemailer.default.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
    await transport.sendMail({ from: args.from || env.SMTP_FROM, to: args.to, subject: args.subject, html: args.body });
    return { sent: true };
  }

  console.warn(`[sendEmail] No RESEND_API_KEY/SMTP_HOST configured — logging instead of sending:\n  to=${args.to}\n  subject=${args.subject}`);
  return { sent: false };
}
