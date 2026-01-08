
interface TurnstileVerifyResponse {
    success: boolean;
    'error-codes'?: string[];
    challenge_ts?: string;
    hostname?: string;
}

export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    if (!secretKey) {
        console.warn('[Turnstile] No TURNSTILE_SECRET_KEY configured. Allowing request (Bypass Mode).');
        return true;
    }

    try {
        const formData = new URLSearchParams();
        formData.append('secret', secretKey);
        formData.append('response', token);
        if (ip) {
            formData.append('remoteip', ip);
        }

        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json() as TurnstileVerifyResponse;

        if (result.success) {
            return true;
        }

        console.warn('[Turnstile] Verification failed:', result['error-codes']);
        return false;
    } catch (error) {
        console.error('[Turnstile] Verification error:', error);
        // Fail closed if actual API error
        return false;
    }
}
