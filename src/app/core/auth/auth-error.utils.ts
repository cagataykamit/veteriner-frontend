import { HttpErrorResponse } from '@angular/common/http';
import type { ProblemDetails } from '@/app/shared/models/problem-details.model';
import {
    isUnhelpfulProblemText,
    messageFromHttpError,
    panelHttpFailureMessage,
    rateLimitUserMessage
} from '@/app/shared/utils/api-error.utils';

/** `/me/clinics` boş veya kullanıcıya atanmış klinik yok. */
export const AUTH_NO_ACCESSIBLE_CLINICS_MESSAGE = 'Bu hesap için erişilebilir klinik bulunamadı.';

/** Yanlış e-posta/şifre; kullanıcı var/yok ifşası yok. */
const LOGIN_INVALID_CREDENTIALS_MESSAGE = 'E-posta veya şifre hatalı.';

/**
 * `application/problem+json` — `extensions.code` öncelikli (title metinleri backend’de değişebilir).
 * ASP.NET: `extensions: { code, traceId, correlationId, timestampUtc }`.
 */
const AUTH_PROBLEM_CODE_MESSAGES: Record<string, string> = {
    'Auth.UserClinicNotAssigned': 'Bu kliniğe erişim yetkiniz bulunmuyor.',
    'Auth.UserMultipleTenantsForbidden':
        'Bu kullanıcı kaydında kiracı üyeliği tutarsız. Lütfen yöneticinizle iletişime geçin.',
    'Auth.ClinicNotFound': 'Seçilen klinik bulunamadı.',
    'Auth.ClinicSelectionRequired': 'Birden fazla aktif klinik var. Devam etmek için klinik seçimi gerekli.',
    'Auth.TenantMismatch': 'Kiracı bağlamı uyuşmuyor. Lütfen tekrar giriş yapın.',
    'Auth.TenantMembershipRequired': 'Bu işlem için kiracı üyeliği gerekli.',
    'Tenants.NotFound': 'Kiracı bulunamadı veya erişilemiyor.',
    'Tenants.TenantInactive': 'Kiracı hesabı aktif değil.',
    'Auth.Validation.InvalidRequestBody': 'İstek gövdesi geçersiz. Alanları kontrol edip tekrar deneyin.',
    'Auth.Validation.RefreshTokenRequired': 'Yenileme anahtarı gerekli. Lütfen tekrar giriş yapın.',
    'Auth.Validation.SelectClinicRequestInvalid': 'Klinik seçim isteği geçersiz. Lütfen tekrar deneyin.'
};

function messageForAuthProblemCode(code: string, context: 'login' | 'general'): string | null {
    const trimmed = code.trim();
    if (!trimmed) {
        return null;
    }
    const exact = AUTH_PROBLEM_CODE_MESSAGES[trimmed];
    if (exact) {
        return exact;
    }
    if (trimmed.startsWith('Auth.Unauthorized.')) {
        return context === 'login' ? LOGIN_INVALID_CREDENTIALS_MESSAGE : 'Yetkisiz işlem. Lütfen tekrar giriş yapın.';
    }
    if (trimmed.startsWith('Auth.Validation.')) {
        return 'İstek geçersiz. Alanları kontrol edip tekrar deneyin.';
    }
    return null;
}

/**
 * Sadece login HTTP hatası — önce `extensions.code`, title’a güvenilmez.
 */
export function loginFailureMessage(err: HttpErrorResponse): string {
    if (err.status === 0 || err.status === 429) {
        return authFailureMessage(err, 'Giriş başarısız.');
    }
    const problem = readProblemDetails(err);
    const code = problem?.code?.trim() ?? '';
    if (code) {
        const byCode = messageForAuthProblemCode(code, 'login');
        if (byCode) {
            return byCode;
        }
    }
    if (err.status === 401) {
        return LOGIN_INVALID_CREDENTIALS_MESSAGE;
    }
    if (err.status === 400 && code) {
        const byCode = messageForAuthProblemCode(code, 'login');
        if (byCode) {
            return byCode;
        }
    }
    return authFailureMessage(err, 'Giriş başarısız.');
}

/**
 * Refresh veya oturum kaybı sonrası genel mesaj.
 */
export function authRefreshFailureMessage(err: unknown, fallback = 'Oturum yenilenemedi. Lütfen tekrar giriş yapın.'): string {
    if (err instanceof HttpErrorResponse) {
        return authFailureMessage(err, fallback);
    }
    return panelHttpFailureMessage(err, fallback);
}

export function authFailureMessage(err: HttpErrorResponse, fallback = 'İşlem başarısız.'): string {
    if (err.status === 0) {
        return 'Sunucuya ulaşılamıyor. API adresini ve ağı kontrol edin.';
    }

    const problem = readProblemDetails(err);
    logProblemContext(problem);

    const code = problem?.code?.trim() ?? '';
    if (code) {
        if (code === 'RateLimit.Exceeded' || err.status === 429) {
            return rateLimitUserMessage(err);
        }
        const byCode = messageForAuthProblemCode(code, 'general');
        if (byCode) {
            return byCode;
        }
    }

    if (err.status === 429) {
        return rateLimitUserMessage(err);
    }

    if (err.status === 401) {
        const detail = problem?.detail?.trim() ?? '';
        if (detail && !isUnhelpfulProblemText(detail)) {
            return detail;
        }
        return 'Yetkisiz işlem. Lütfen tekrar giriş yapın.';
    }

    if (problem?.detail?.trim() && !isUnhelpfulProblemText(problem.detail)) {
        return problem.detail.trim();
    }
    if (problem?.title?.trim() && !isUnhelpfulProblemText(problem.title)) {
        return problem.title.trim();
    }
    return messageFromHttpError(err, fallback);
}

function readProblemDetails(err: HttpErrorResponse): ProblemDetails | null {
    const body = err.error as unknown;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return null;
    }
    const o = body as Record<string, unknown>;
    const ext =
        o['extensions'] && typeof o['extensions'] === 'object' && !Array.isArray(o['extensions'])
            ? (o['extensions'] as Record<string, unknown>)
            : null;

    const pickExtString = (key: string): string | null => {
        if (!ext) {
            return null;
        }
        const v = ext[key];
        return typeof v === 'string' && v.trim() ? v.trim() : null;
    };

    const codeFromExtensions = pickExtString('code');
    const code =
        (typeof o['code'] === 'string' && o['code'].trim() ? o['code'].trim() : null) ||
        (typeof o['Code'] === 'string' && o['Code'].trim() ? o['Code'].trim() : null) ||
        codeFromExtensions;

    const traceId = pickExtString('traceId') ?? pickExtString('TraceId');
    const correlationId = pickExtString('correlationId') ?? pickExtString('CorrelationId');
    const timestampUtc = pickExtString('timestampUtc') ?? pickExtString('TimestampUtc');

    return {
        type: typeof o['type'] === 'string' ? o['type'] : null,
        title: typeof o['title'] === 'string' ? o['title'] : null,
        status: typeof o['status'] === 'number' ? o['status'] : null,
        detail: typeof o['detail'] === 'string' ? o['detail'] : null,
        instance: typeof o['instance'] === 'string' ? o['instance'] : null,
        code: code ?? null,
        traceId: traceId ?? null,
        correlationId: correlationId ?? null,
        timestampUtc: timestampUtc ?? null,
        errors: (o['errors'] as ProblemDetails['errors']) ?? null
    };
}

function logProblemContext(problem: ProblemDetails | null): void {
    if (!problem) {
        return;
    }
    if (!problem.code && !problem.traceId && !problem.correlationId) {
        return;
    }
    console.debug('[auth-problem-details]', {
        code: problem.code ?? null,
        traceId: problem.traceId ?? null,
        correlationId: problem.correlationId ?? null,
        timestampUtc: problem.timestampUtc ?? null
    });
}
