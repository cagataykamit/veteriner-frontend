import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

export const SIGNUP_EMAIL_CODE_LENGTH = 6;

/** Sunucu mesajlarıyla aynı (`TRIAL_SIGNUP_ABUSE_API_CONTRACT.md` §5). */
export const TRIAL_SIGNUP_CODE_MESSAGES: Record<string, string> = {
    'SignupIdentity.DuplicateEmail': 'Bu e-posta adresiyle daha önce deneme hesabı açılmış.',
    'SignupIdentity.DuplicateTaxIdentity': 'Bu vergi numarasıyla daha önce deneme hesabı açılmış.',
    'SignupIdentity.Validation.TaxIdentityRequired': 'Geçerli bir vergi numarası (10 hane) ya da TC kimlik numarası (11 hane) girin.',
    'SignupEmail.DailyLimitReached': 'Kod gönderme sınırına ulaşıldı. Lütfen birkaç saat sonra yeniden deneyin.',
    'SignupEmail.CodeInvalid': 'Kod hatalı ya da süresi dolmuş. Kodu kontrol edin veya yeni kod isteyin.',
    'SignupEmail.VerificationRequired': 'E-posta adresinizi doğrulayın. Doğrulamanın süresi dolduysa yeni kod isteyin.',
    'HumanVerification.Failed': 'Güvenlik doğrulaması tamamlanamadı. Sayfayı yenileyip yeniden deneyin.',
    'HumanVerification.Unavailable': 'Güvenlik doğrulaması şu an yapılamıyor. Lütfen biraz sonra yeniden deneyin.',
    'RateLimit.Exceeded': 'Çok sık denediniz. Lütfen biraz bekleyip yeniden deneyin.'
};

export const TAX_IDENTITY_INVALID_MESSAGE = TRIAL_SIGNUP_CODE_MESSAGES['SignupIdentity.Validation.TaxIdentityRequired'];

/** Hafif biçim denetimi (10 ya da 11 rakam); sağlama algoritması sunucudadır (`TurkishTaxIdentity`). */
export function isTaxIdentityFormat(value: string): boolean {
    return /^\d{10,11}$/.test((value ?? '').trim());
}

export function trialSignupErrorCode(err: unknown): string | null {
    const body = problemBody(err);
    const ext = body?.['extensions'] as Record<string, unknown> | undefined;
    const code = body?.['code'] ?? ext?.['code'];

    return typeof code === 'string' && code.trim() ? code.trim() : null;
}

/** 429 yanıtındaki bekleme (`retryAfterSeconds`); yoksa `null`. */
export function trialSignupRetryAfterSeconds(err: unknown): number | null {
    const body = problemBody(err);
    const ext = body?.['extensions'] as Record<string, unknown> | undefined;
    const value = body?.['retryAfterSeconds'] ?? ext?.['retryAfterSeconds'];

    return typeof value === 'number' && value > 0 ? Math.ceil(value) : null;
}

export function trialSignupFailureMessage(err: unknown, fallback: string): string {
    const code = trialSignupErrorCode(err);

    if (code === 'SignupEmail.ResendTooSoon') {
        const seconds = trialSignupRetryAfterSeconds(err);

        return seconds ? `Yeni kod için ${seconds} saniye bekleyin.` : 'Yeni kod için biraz bekleyin.';
    }

    if (code && TRIAL_SIGNUP_CODE_MESSAGES[code]) {
        return TRIAL_SIGNUP_CODE_MESSAGES[code];
    }

    if (!(err instanceof HttpErrorResponse)) {
        return fallback;
    }

    // Doğrulama hatası (FluentValidation, `errors` alan sözlüğü): sunucunun ilk alan mesajı.
    if (err.status === 400 && (!code || code.startsWith('Validation.'))) {
        return firstFieldError(err.error) ?? fallback;
    }

    return messageFromHttpError(err, fallback);
}

function problemBody(err: unknown): Record<string, unknown> | null {
    return err instanceof HttpErrorResponse && err.error && typeof err.error === 'object' ? (err.error as Record<string, unknown>) : null;
}

function firstFieldError(body: unknown): string | null {
    const errors = body && typeof body === 'object' ? (body as Record<string, unknown>)['errors'] : null;

    if (!errors || typeof errors !== 'object') {
        return null;
    }

    for (const value of Object.values(errors as Record<string, unknown>)) {
        if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
            return value[0].trim();
        }
    }

    return null;
}
