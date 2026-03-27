import { HttpErrorResponse } from '@angular/common/http';
import type { ProblemDetails } from '@/app/shared/models/problem-details.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

/** Login ekranı — mevcut loginFailureMessage ile uyumlu. */
export function loginFailureMessage(err: HttpErrorResponse): string {
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
    if (err instanceof Error) {
        return err.message || fallback;
    }
    return fallback;
}

export const AUTH_TENANT_SELECT_REQUIRED_MESSAGE = 'Bu hesap birden fazla kiracıya bağlı. Devam etmek için kiracı seçin.';

export function authFailureMessage(err: HttpErrorResponse, fallback = 'İşlem başarısız.'): string {
    if (err.status === 0) {
        return 'Sunucuya ulaşılamıyor. API adresini ve ağı kontrol edin.';
    }

    const problem = readProblemDetails(err);
    logProblemContext(problem);

    if (err.status === 429) {
        const retryAfter = err.headers.get('Retry-After');
        const sec = retryAfter ? Number.parseInt(retryAfter, 10) : NaN;
        const waitHint = !Number.isNaN(sec) ? ` Yaklaşık ${sec} saniye sonra tekrar deneyin.` : ' Lütfen kısa süre sonra tekrar deneyin.';
        return problem?.detail?.trim() || problem?.title?.trim() || `Çok fazla istek (429).${waitHint}`;
    }

    if (err.status === 401) {
        return problem?.detail?.trim() || problem?.title?.trim() || 'Yetkisiz işlem. Lütfen tekrar giriş yapın.';
    }

    if (problem?.detail?.trim()) {
        return problem.detail.trim();
    }
    if (problem?.title?.trim()) {
        return problem.title.trim();
    }
    return messageFromHttpError(err, fallback);
}

function readProblemDetails(err: HttpErrorResponse): ProblemDetails | null {
    const body = err.error as unknown;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return null;
    }
    return body as ProblemDetails;
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
