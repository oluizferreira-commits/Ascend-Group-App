import "server-only";
import nodemailer from "nodemailer";

export async function sendMail(to: string, subject: string, text: string) {
  const host = process.env.SMTP_HOST;
  if (!host) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n[mail:dev] Para: ${to}\nAssunto: ${subject}\n${text}\n`);
    } else {
      console.warn("[mail] SMTP_HOST não configurado — e-mail não enviado.");
    }
    return;
  }
  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  await transport.sendMail({ from: process.env.SMTP_FROM, to, subject, text });
}
