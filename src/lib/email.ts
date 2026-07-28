import nodemailer from "nodemailer";

const APP_NAME = "AI Reseller Pro";

function getCredentials(): { user: string; pass: string } | null {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return { user, pass };
}

export function emailIsConfigured(): boolean {
  return getCredentials() !== null;
}

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const creds = getCredentials();
  if (!creds) return null;
  if (!cachedTransporter) {
    // Gmail SMTP via an account App Password (not the real account
    // password — Google requires a separate, revocable App Password for
    // third-party SMTP access). No third-party email service involved.
    cachedTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: creds.user, pass: creds.pass },
    });
  }
  return cachedTransporter;
}

async function sendMail(opts: { to: string; subject: string; html: string; text: string }): Promise<boolean> {
  const transporter = getTransporter();
  const creds = getCredentials();
  if (!transporter || !creds) {
    console.log(`[email disabled] Would send "${opts.subject}" to ${opts.to}. Set GMAIL_USER + GMAIL_APP_PASSWORD to enable.`);
    return false;
  }
  try {
    await transporter.sendMail({
      from: `"${APP_NAME}" <${creds.user}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return true;
  } catch (err) {
    console.error("email send failed", err);
    return false;
  }
}

function wrap(title: string, bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #4f46e5; margin-bottom: 4px;">${APP_NAME}</h2>
      <h3 style="margin-top: 0;">${title}</h3>
      ${bodyHtml}
      <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">
        You're receiving this because it's tied to your ${APP_NAME} account.
      </p>
    </div>
  `;
}

export async function sendWelcomeEmail(to: string, name: string | null): Promise<boolean> {
  const greeting = name ? `Hi ${name},` : "Hi there,";
  return sendMail({
    to,
    subject: `Welcome to ${APP_NAME}`,
    html: wrap(
      "Welcome aboard!",
      `<p>${greeting}</p><p>Your account is ready. Scan your first item to get an AI-generated price and listing in minutes.</p>`
    ),
    text: `${greeting}\n\nYour ${APP_NAME} account is ready. Scan your first item to get started.`,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  return sendMail({
    to,
    subject: `Reset your ${APP_NAME} password`,
    html: wrap(
      "Password reset requested",
      `<p>Click the link below to set a new password. This link expires in 1 hour.</p>
       <p><a href="${resetUrl}" style="background:#4f46e5;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Reset password</a></p>
       <p style="color:#6b7280;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>`
    ),
    text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
  });
}

export async function sendItemSoldEmail(
  to: string,
  item: { name: string; salePrice: number; profit: number | null }
): Promise<boolean> {
  return sendMail({
    to,
    subject: `Sold: ${item.name}`,
    html: wrap(
      "Item sold! 🎉",
      `<p><strong>${item.name}</strong> sold for $${item.salePrice.toFixed(2)}.</p>
       ${item.profit != null ? `<p>Profit: <strong>$${item.profit.toFixed(2)}</strong></p>` : ""}`
    ),
    text: `${item.name} sold for $${item.salePrice.toFixed(2)}.${
      item.profit != null ? ` Profit: $${item.profit.toFixed(2)}.` : ""
    }`,
  });
}

export async function sendBuyerMessageAlertEmail(
  to: string,
  message: { buyerName: string; itemName: string; body: string; kind: string }
): Promise<boolean> {
  return sendMail({
    to,
    subject: `New ${message.kind} from ${message.buyerName} on ${message.itemName}`,
    html: wrap(
      "New buyer message",
      `<p><strong>${message.buyerName}</strong> sent a ${message.kind} about <strong>${message.itemName}</strong>:</p>
       <p style="background:#f1f2f6;padding:12px;border-radius:8px;">${message.body}</p>
       <p>Reply from the Messages page in the app.</p>`
    ),
    text: `${message.buyerName} sent a ${message.kind} about ${message.itemName}: "${message.body}"`,
  });
}
