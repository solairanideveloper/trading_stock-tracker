#!/usr/bin/env node
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'database', '.env') });

let sender = process.env.NODEMAILER_EMAIL;
let pass = process.env.NODEMAILER_PASSWORD;
const to = process.env.TEST_EMAIL || sender;
let usingTestAccount = false;

if(!sender || !pass) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('⚠️ NODEMAILER_EMAIL or NODEMAILER_PASSWORD missing - falling back to Ethereal test account for local testing.');
  } else {
    console.error('Missing NODEMAILER_EMAIL or NODEMAILER_PASSWORD in env.');
    process.exit(1);
  }
}

// Quick sanity checks for common Gmail issues
if (pass && (pass.includes(' ') || pass.length < 8)) {
  console.warn('⚠️ NODEMAILER_PASSWORD looks unusual (contains spaces or is very short). If you use Gmail with 2FA enabled, generate an App Password (16 characters, no spaces) and set it in database/.env as NODEMAILER_PASSWORD.');
}

(async () => {
  try {
    let transporter;
    if (!sender || !pass) {
      const testAccount = await nodemailer.createTestAccount();
      sender = testAccount.user;
      pass = testAccount.pass;
      usingTestAccount = true;
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: sender, pass }
      });
    } else {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: sender, pass }
      });
    }

    const info = await transporter.sendMail({
      from: `"Signalist Test" <${sender}>`,
      to,
      subject: 'Signalist test email',
      text: 'This is a test email from Signalist app',
      html: '<p>This is a test email from <strong>Signalist</strong></p>',
    });
    console.log('Message sent:', info.messageId || info.response || info);
    if(info.response) console.log('Response:', info.response);
    if (usingTestAccount) console.log('🔗 Preview URL:', nodemailer.getTestMessageUrl(info));
  } catch (e) {
    console.error('Send failed:', e.message || e);
    if (e.response) console.error('SMTP response:', e.response);
    process.exit(1);
  }
})();
