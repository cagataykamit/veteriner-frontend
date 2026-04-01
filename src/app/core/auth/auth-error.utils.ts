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

const AUTH_SECURITY_CODE_MESSAGES: Record<string, string> = {
    'Auth.UserClinicNotAssigned': 'Bu kliniğe erişim yetkiniz bulunmuyor.',
    'Auth.UserMultipleTenantsForbidden': 'Bu kullanıcı kaydında kiracı üyeliği tutarsız. Lütfen yöneticinizle iletişime geçin.'
};

/** Yanlış e-posta/şifre; kullanıcı var/yok ifşası yok. */
const LOGIN_INVALID_CREDENTIALS_MESSAGE = 'E-posta veya şifre hatalı.';

/**
 * Sadece login HTTP hatası için — `authFailureMessage` ile aynı ağ/429 yolları,
 * geçersiz kimlik bilgisi (401 ve tipik 400 ProblemDetails) için sabit mesaj.
 */
export function loginFailureMessage(err: HttpErrorResponse): string {
    if (err.status === 0 || err.status === 429) {
        return authFailureMessage(err, 'Giriş başarısız.');
    }
    const problemEarly = readProblemDetails(err);
    const security = authSecurityModelMessageForProblem(problemEarly);
    if (security) {
        return security;
    }
    if (err.status === 401) {
        return LOGIN_INVALID_CREDENTIALS_MESSAGE;
    }
    if (err.status === 400) {
        const problem = readProblemDetails(err);
        const detail = problem?.detail?.trim() ?? '';
        const title = problem?.title?.trim() ?? '';
        const haystack = `${detail} ${title}`.toLowerCase();
        if (
            haystack.includes('doğrulanamadı') ||
            haystack.includes('invalid login') ||
            haystack.includes('invalid credentials')
        ) {
            return LOGIN_INVALID_CREDENTIALS_MESSAGE;
        }
    }
    return authFailureMessage(err, 'Giriş başarısız.');
}

/**
 * Refresh veya oturum kaybı sonrası genel mesaj.
 * Detay için önce ProblemDetails, yoksa status.
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

    const security = authSecurityModelMessageForProblem(problem);
    if (security) {
        return security;
    }

    if (err.status === 429) {
        return rateLimitUserMessage(err);
    }

    if (err.status === 401) {
        const detail = problem?.detail?.trim() ?? '';
        const title = problem?.title?.trim() ?? '';
        if (detail && !isUnhelpfulProblemText(detail)) {
            return detail;
        }
        if (title && !isUnhelpfulProblemText(title)) {
            return title;
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
    const base = { ...(body as ProblemDetails) };
    if (!base.code?.trim() && typeof o['Code'] === 'string') {
        base.code = o['Code'].trim();
    }
    return base;
}

function authSecurityModelMessageForProblem(problem: ProblemDetails | null): string | null {
    const code = problem?.code?.trim();
    if (!code) {
        return null;
    }
    return AUTH_SECURITY_CODE_MESSAGES[code] ?? null;
}

function logProblemContext(problem: ProblemDetails | null): void {
    if (!problem) {
        return;
    }
    if (!problem.code && !problem.traceId && !problem.correlationId) {
        return;
    }
    // Kullanıcıya gösterilmez; hata korelasyonu için debug seviyesinde tutulur.
    console.debug('[auth-problem-details]', {
        code: problem.code ?? null,
        traceId: problem.traceId ?? null,
        correlationId: problem.correlationId ?? null,
        timestampUtc: problem.timestampUtc ?? null
    });
}
