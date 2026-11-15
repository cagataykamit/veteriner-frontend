/** `POST /public/owner-signup/phone-code` yanıtı (`TRIAL_PHONE_VERIFICATION_API_CONTRACT.md` §2). */
export interface SignupPhoneCodeSentDto {
    expiresInSeconds: number;
    resendAfterSeconds: number;
}

/** `POST /public/owner-signup/phone-code/verify` yanıtı (§3). */
export interface SignupPhoneVerifiedDto {
    phoneVerificationToken: string;
    expiresAtUtc: string;
}

/** Doğrulanan numara ve kayıtta gönderilecek jeton. */
export interface SignupPhoneVerification {
    readonly mobilePhone: string;
    readonly token: string;
}
