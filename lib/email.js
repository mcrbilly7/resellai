import nodemailer from "nodemailer";

let transporter;

// Sends mail through your Gmail account using an "App Password" - the long
// key mentioned in the README. This is exactly the pattern most no-code /
// low-code platforms use behind the scenes for "connect your Gmail" features.
function getTransporter() {
  if (!transporter) {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set in your environment variables.");
    }
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, text, html }) {
  const t = getTransporter();
  const fromName = process.env.EMAIL_FROM_NAME || "ResellAI";
  return t.sendMail({
    from: `"${fromName}" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
}
