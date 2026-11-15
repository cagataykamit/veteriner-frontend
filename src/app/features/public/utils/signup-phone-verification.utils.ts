import { HttpErrorResponse } from '@angular/common/http';
import { isValidTurkishMobileDigits } from '@/app/entities/client/utils/client-create-phone.utils';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

/** Sunucu mesajıyla aynı (`TRIAL_PHONE_VERIFICATION_API_CONTRACT.md` §4). */
export const SIGNUP_PHONE_INVALID_MESSAGE = 'Geçerli bir cep telefonu numarası girin (5XX XXX XX XX).';
export const SIGNUP_PHONE_CODE_LENGTH = 6;

export const SIGNUP_PHONE_CODE_MESSAGES: Record<string, string> = {
    'SignupPhone.DuplicateTrial': 'Bu telefon numarasıyla daha önce deneme hesabı açılmış.',
    'SignupPhone.DailyLimitReached': 'Kod gönderme sınırına ulaşıldı. Lütfen birkaç saat sonra yeniden deneyin.',
    'SignupPhone.CodeInvalid': 'Kod hatalı ya da süresi dolmuş. Kodu kontrol edin veya yeni kod isteyin.',
    'SignupPhone.VerificationRequired': 'Telefon numaranızı doğrulayın. Doğrulamanın süresi dolduysa yeni kod isteyin.',
    'Sms.NotConfigured': 'Telefon doğrulaması şu an kullanılamıyor. Lütfen daha sonra yeniden deneyin.',
    'Sms.SendFailed': 'Kod gönderilemedi. Lütfen biraz sonra yeniden deneyin.',
    'RateLimit.Exceeded': 'Çok sık denediniz. Lütfen biraz bekleyip yeniden deneyin.'
};

/** Türkiye cep numarası mı (biçim kuralı istemci tarafında `isValidTurkishMobileDigits`, asıl doğruluk sunucuda). */
export function isSignupMobilePhone(value: string): boolean {
    return isValidTurkishMobileDigits((value ?? '').replace(/\D/g, ''));
}

export function signupPhoneErrorCode(err: unknown): string | null {
    if (!(err instanceof HttpErrorResponse) || !err.error || typeof err.error !== 'object') {
        return null;
    }

    const body = err.error as Record<string, unknown>;
    const ext = body['extensions'] as Record<string, unknown> | undefined;
    const code = body['code'] ?? ext?.['code'];

    return typeof code === 'string' && code.trim() ? code.trim() : null;
}

/** 429 yanıtındaki bekleme (`retryAfterSeconds`); yoksa `null`. */
export function signupPhoneRetryAfterSeconds(err: unknown): number | null {
    if (!(err instanceof HttpErrorResponse) || !err.error || typeof err.error !== 'object') {
        return null;
    }

    const body = err.error as Record<string, unknown>;
    const ext = body['extensions'] as Record<string, unknown> | undefined;
    const value = body['retryAfterSeconds'] ?? ext?.['retryAfterSeconds'];

    return typeof value === 'number' && value > 0 ? Math.ceil(value) : null;
}

export function signupPhoneFailureMessage(err: unknown, fallback: string): string {
    const code = signupPhoneErrorCode(err);

    if (code === 'SignupPhone.ResendTooSoon') {
        const seconds = signupPhoneRetryAfterSeconds(err);

        return seconds ? `Yeni kod için ${seconds} saniye bekleyin.` : 'Yeni kod için biraz bekleyin.';
    }

    if (code && SIGNUP_PHONE_CODE_MESSAGES[code]) {
        return SIGNUP_PHONE_CODE_MESSAGES[code];
    }

    if (!(err instanceof HttpErrorResponse)) {
        return fallback;
    }

    // Doğrulama hatası (FluentValidation, `errors` alan sözlüğü): sunucunun ilk alan mesajı, yoksa numara biçimi mesajı.
    if (err.status === 400 && (!code || code.startsWith('Validation.'))) {
        return firstFieldError(err.error) ?? SIGNUP_PHONE_INVALID_MESSAGE;
    }

    return messageFromHttpError(err, fallback);
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
