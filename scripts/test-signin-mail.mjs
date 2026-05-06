#!/usr/bin/env node
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'database', '.env') });

let sender = process.env.NODEMAILER_EMAIL;
let pass = process.env.NODEMAILER_PASSWORD;
const to = process.env.TEST_EMAIL || sender || 'test@example.com';
let usingTestAccount = false;

(async () => {
  try {
    let transporter;
    if (!sender || !pass) {
      if (process.env.NODE_ENV === 'production') {
        console.error('NODEMAILER_EMAIL and NODEMAILER_PASSWORD are required in production.');
        process.exit(1);
      }
      console.warn('No real SMTP creds found — creating Ethereal test account for local testing.');
      const testAccount = await nodemailer.createTestAccount();
      sender = testAccount.user;
      pass = testAccount.pass;
      usingTestAccount = true;
      transporter = nodemailer.createTransport({ host: 'smtp.ethereal.email', port: 587, auth: { user: sender, pass } });
    } else {
      transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: sender, pass } });
    }

    const now = new Date();
    const timeStr = now.toISOString();
    const ip = process.env.TEST_IP || '127.0.0.1';
    const ua = process.env.TEST_UA || 'Mozilla/5.0 (Test)';

    const textBody = `New sign-in to your Signalist account\n\nAccount: ${to}\nTime: ${timeStr}\nIP: ${ip}\nDevice/Agent: ${ua}\n\nIf this wasn't you, secure your account immediately: https://stock-market-dev.vercel.app/`;

    const htmlBody = `<!doctype html><html><body><h2 style="color:#FDD458;">New sign-in detected</h2><p>Account: <strong>${to}</strong></p><p>Time: <strong>${timeStr}</strong></p><p>IP: <strong>${ip}</strong></p><p>Device/Agent: <strong>${ua}</strong></p><p>If this wasn't you, <a href="https://stock-market-dev.vercel.app/">secure your account</a> immediately.</p></body></html>`;

    const info = await transporter.sendMail({
      from: `"Signalist" <${sender}>`,
      to,
      subject: 'Security notice: New sign-in to your account',
      text: textBody,
      html: htmlBody,
    });

    console.log('Message sent:', info.messageId || info.response || info);
    if (info.response) console.log('Response:', info.response);
    if (usingTestAccount) console.log('🔗 Preview URL:', nodemailer.getTestMessageUrl(info));
    console.log('\n📩 Email preview (text):\n', textBody);
  } catch (e) {
    console.error('Send failed:', e.message || e);
    if (e.response) console.error('SMTP response:', e.response);
    process.exit(1);
  }
})();