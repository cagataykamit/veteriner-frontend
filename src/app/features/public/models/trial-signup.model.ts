/** `GET /public/owner-signup/settings` (`TRIAL_SIGNUP_ABUSE_API_CONTRACT.md` §1). */
export interface OwnerSignupSettingsDto {
    taxIdentityNumberRequired: boolean;
    /** Boşsa (yerel geliştirme) Turnstile widget'ı çizilmez. */
    turnstileSiteKey: string | null;
}

/** `POST /public/owner-signup/email-code` yanıtı (§2). */
export interface SignupEmailCodeSentDto {
    expiresInSeconds: number;
    resendAfterSeconds: number;
}

/** `POST /public/owner-signup/email-code/verify` yanıtı (§2). */
export interface SignupEmailVerifiedDto {
    emailVerificationToken: string;
    expiresAtUtc: string;
}

/** Doğrulanan e-posta ve kayıtta gönderilecek jeton. */
export interface SignupEmailVerification {
    readonly email: string;
    readonly token: string;
}

/** Sunucudaki `HumanVerificationActions.SignupEmailCode` ile aynı. */
export const SIGNUP_EMAIL_CODE_ACTION = 'signup-email-code';
