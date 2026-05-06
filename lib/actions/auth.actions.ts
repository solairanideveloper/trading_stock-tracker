'use server';

import {auth} from "@/lib/better-auth/auth";
import {inngest} from "@/lib/inngest/client";
import {headers} from "next/headers";
import { sendSignInNotification } from "@/lib/nodemailer";

export const signUpWithEmail = async ({ email, password, fullName, country, investmentGoals, riskTolerance, preferredIndustry }: SignUpFormData) => {
    try {
        const response = await auth.api.signUpEmail({ body: { email, password, name: fullName } })

        if(response) {
            await inngest.send({
                name: 'app/user.created',
                data: { email, name: fullName, country, investmentGoals, riskTolerance, preferredIndustry }
            })
        }

        return { success: true, data: response }
    } catch (e) {
        console.log('Sign up failed', e)
        return { success: false, error: 'Sign up failed' }
    }
}

export const signInWithEmail = async ({ email, password }: SignInFormData) => {
    console.log('signInWithEmail called for', email);
    try {
        const response = await auth.api.signInEmail({ body: { email, password } })
        console.log('signInWithEmail succeeded for', email);

        // Fire-and-forget: send sign-in notification (best-effort)
        try {
            const hdrs = headers();
            const ip = hdrs.get('x-forwarded-for') || hdrs.get('x-real-ip') || 'unknown';
            const ua = hdrs.get('user-agent') || undefined;
            console.log('Attempting to send sign-in notification — email:', email, 'ip:', ip, 'ua:', ua);
            await sendSignInNotification({ email, name: (response as any)?.user?.name || undefined, time: new Date().toISOString(), ip, userAgent: ua });
            console.log('Sign-in notification sent for', email);
        } catch (notifyErr) {
            console.warn('Sign-in notification failed', notifyErr && (notifyErr.message || notifyErr));
        }

        return { success: true, data: response }
    } catch (e) {
        console.log('Sign in failed', e)
        return { success: false, error: 'Sign in failed' }
    }
}

export const signOut = async () => {
    try {
        await auth.api.signOut({ headers: await headers() });
    } catch (e) {
        console.log('Sign out failed', e)
        return { success: false, error: 'Sign out failed' }
    }
}
