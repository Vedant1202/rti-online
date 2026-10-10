import nodemailer, { type Transporter } from "nodemailer";

export type Email = { to: string; subject: string; text: string };

/** Emails "sent" without Gmail credentials (local dev, tests) land here and in the server log. */
export const outbox: Email[] = [];
export function clearOutbox() {
  outbox.length = 0;
}

let transporter: Transporter | null = null;

function gmail(): Transporter | null {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass || process.env.NODE_ENV === "test") return null;
  transporter ??= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  return transporter;
}

/** Optional safety net: EMAIL_ALLOWLIST="team@gmail.com,@college.edu" limits who can receive mail. */
function allowed(to: string): boolean {
  const list = process.env.EMAIL_ALLOWLIST?.split(",").map((s) => s.trim().toLowerCase());
  if (!list?.length || list[0] === "") return true;
  const addr = to.toLowerCase();
  const domain = addr.slice(addr.indexOf("@"));
  // Plus-addresses count as their base address: team+cpio@gmail.com → team@gmail.com.
  const base = addr.replace(/\+[^@]*@/, "@");
  return list.some((entry) => entry === addr || entry === base || entry === domain);
}

/** Awaited on purpose: a serverless function can be frozen once it responds. */
export async function sendEmail(email: Email): Promise<void> {
  if (!allowed(email.to)) {
    console.warn(`[email] skipped ${email.to}: not in EMAIL_ALLOWLIST`);
    return;
  }
  const t = gmail();
  if (!t) {
    outbox.push(email);
    if (process.env.NODE_ENV !== "test") {
      console.info(`[email] to=${email.to} subject="${email.subject}"\n${email.text}`);
    }
    return;
  }
  await t.sendMail({
    from: `RTI Online Rebuild <${process.env.GMAIL_USER}>`,
    to: email.to,
    subject: email.subject,
    text: email.text,
  });
}
