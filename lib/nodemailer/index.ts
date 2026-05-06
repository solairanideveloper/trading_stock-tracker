import nodemailer from 'nodemailer';
import {WELCOME_EMAIL_TEMPLATE, NEWS_SUMMARY_EMAIL_TEMPLATE, SIGNIN_EMAIL_TEMPLATE} from "@/lib/nodemailer/templates";

export let transporter: nodemailer.Transporter | null = null;
let mailerReady = false;
let usingTestAccount = false;

async function createTransporter(): Promise<nodemailer.Transporter> {
    // Prefer explicit credentials (Gmail + App Password)
    if (process.env.NODEMAILER_EMAIL && process.env.NODEMAILER_PASSWORD) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            }
        });
    }

    // In development, fall back to Ethereal test account so devs can preview emails without real SMTP creds
    if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ NODEMAILER_EMAIL/NODEMAILER_PASSWORD not set. Falling back to Ethereal test account (development only).');
        const testAccount = await nodemailer.createTestAccount();
        usingTestAccount = true;
        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            auth: { user: testAccount.user, pass: testAccount.pass }
        });
    }

    throw new Error('NODEMAILER_EMAIL and NODEMAILER_PASSWORD are required in production to send email.');
}

/**
 * Call this on startup to verify mailer configuration (helps surface credential issues early)
 */
export const initMailer = async (): Promise<void> => {
    try {
        if (!transporter) transporter = await createTransporter();
        await transporter.verify();
        mailerReady = true;
        console.log('✅ Mailer verified and ready to send messages.');
    } catch (err: any) {
        console.error('❌ Mailer verification failed. Check NODEMAILER_EMAIL and NODEMAILER_PASSWORD (use a Gmail App Password if your account has 2FA enabled).', err.response || err.message || err);
        throw err;
    }
}

export const sendWelcomeEmail = async ({ email, name, intro }: WelcomeEmailData) => {
    if (!mailerReady) await initMailer();

    // Ensure intro is a safe string and format paragraphs for HTML
    const introSafe = (intro || '').toString();
    const introHtml = introSafe.split(/\r?\n/).map(p => `<p style="margin:0 0 12px 0;">${p}</p>`).join('\n');

    const htmlTemplate = WELCOME_EMAIL_TEMPLATE
        .replace('{{name}}', name)
        .replace('{{intro}}', introHtml);

    // Plaintext fallback so mail clients display the message directly
    const introTextPlain = introSafe.replace(/<[^>]+>/g, '');
    const textTemplate = `Welcome aboard ${name}\n\n${introTextPlain}\n\nHere's what you can do right now:\n- Set up your watchlist to follow your favorite stocks\n- Create price and volume alerts so you never miss a move\n- Explore the dashboard for trends and the latest market news\n\nGo to Dashboard: https://stock-market-dev.vercel.app/\n\n— Signalist`;

    const mailOptions = {
        from: `"Signalist" <${process.env.NODEMAILER_EMAIL || (usingTestAccount ? 'ethereal@localhost' : '')}>`,
        replyTo: process.env.NODEMAILER_EMAIL,
        to: email,
        subject: `Welcome to Signalist - your stock market toolkit is ready!`,
        text: textTemplate,
        html: htmlTemplate,
    }

    try {
        if (!transporter) throw new Error('Mailer not initialized');
        const info: any = await transporter.sendMail(mailOptions);
        console.log('✅ Welcome email sent to', email, info.messageId || info.response || info);
        if (usingTestAccount) {
            console.log('🔗 Preview URL:', nodemailer.getTestMessageUrl(info));
            console.log('📩 Email preview (text):\n', textTemplate);
        }
        return info;
    } catch (err: any) {
        console.error('❌ Failed to send welcome email to', email, err.response || err.message || err);
        throw err;
    }
}

export const sendNewsSummaryEmail = async (
    { email, date, newsContent }: { email: string; date: string; newsContent: string }
): Promise<void> => {
    if (!mailerReady) await initMailer();

    const newsContentSafe = (newsContent || '').toString();
    const htmlTemplate = NEWS_SUMMARY_EMAIL_TEMPLATE
        .replace('{{date}}', date)
        .replace('{{newsContent}}', newsContentSafe.split(/\r?\n/).map(p => `<p style="margin:0 0 12px 0;">${p}</p>`).join('\n'));

    const textTemplate = `Market News Summary — ${date}\n\n${newsContentSafe}\n\nVisit the dashboard: https://stock-market-dev.vercel.app/\n\n— Signalist`;

    const mailOptions = {
        from: `"Signalist News" <${process.env.NODEMAILER_EMAIL || (usingTestAccount ? 'ethereal@localhost' : '')}>`,
        replyTo: process.env.NODEMAILER_EMAIL,
        to: email,
        subject: `📈 Market News Summary Today - ${date}`,
        text: textTemplate,
        html: htmlTemplate,
    };

    try {
        if (!transporter) throw new Error('Mailer not initialized');
        const info: any = await transporter.sendMail(mailOptions);
        console.log('✅ News summary email sent to', email, info.messageId || info.response || info);
        if (usingTestAccount) {
            console.log('🔗 Preview URL:', nodemailer.getTestMessageUrl(info));
            console.log('📩 Email preview (text):\n', textTemplate);
        }
        return info;
    } catch (err: any) {
        console.error('❌ Failed to send news summary email to', email, err.response || err.message || err);
        throw err;
    }
};

export const sendSignInNotification = async (
    { email, name, time, ip, userAgent }: { email: string; name?: string; time: string; ip?: string; userAgent?: string }
) => {
    console.log('sendSignInNotification: start for', email);
    if (!mailerReady) await initMailer();

    const htmlTemplate = SIGNIN_EMAIL_TEMPLATE
        .replace('{{email}}', email)
        .replace('{{time}}', time)
        .replace('{{ip}}', ip || 'unknown')
        .replace('{{userAgent}}', (userAgent || 'unknown'));

    const textTemplate = `Security notice: A sign-in to your Signalist account was detected.\n\nAccount: ${email}\nTime: ${time}\nIP Address: ${ip || 'unknown'}\nDevice/Agent: ${userAgent || 'unknown'}\n\nIf this was you, no action is required. If you do not recognize this sign-in, please secure your account immediately by changing your password and reviewing recent activity: https://stock-market-dev.vercel.app/`;

    const mailOptions: any = {
        from: `"Signalist" <${process.env.NODEMAILER_EMAIL || (usingTestAccount ? 'ethereal@localhost' : '')}>`,
        replyTo: process.env.NODEMAILER_EMAIL,
        to: email,
        subject: `Security notice — new sign-in to your Signalist account`,
        text: textTemplate,
        html: htmlTemplate,
    };

    // Optionally send a copy to an admin/monitoring address (set NODEMAILER_NOTIFY_EMAIL in env)
    if (process.env.NODEMAILER_NOTIFY_EMAIL) {
        mailOptions.bcc = process.env.NODEMAILER_NOTIFY_EMAIL;
    }
    try {
        if (!transporter) throw new Error('Mailer not initialized');
        const info: any = await transporter.sendMail(mailOptions);
        console.log('✅ Sign-in notification sent to', email, info.messageId || info.response || info);
        if (usingTestAccount) {
            console.log('🔗 Preview URL:', nodemailer.getTestMessageUrl(info));
            console.log('📩 Email preview (text):\n', textTemplate);
        }
        return info;
    } catch (err: any) {
        console.error('❌ Failed to send sign-in notification to', email, err.response || err.message || err);
        throw err;
    }
};
