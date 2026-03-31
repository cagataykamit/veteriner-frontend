import { HttpErrorResponse } from '@angular/common/http';
import type { ProblemDetails } from '@/app/shared/models/problem-details.model';

/** Sunucunun genel ProblemDetails başlıkları / Angular transport metni — kullanıcıya göstermek için yetersiz. */
export function isUnhelpfulProblemText(s: string): boolean {
    const t = s.trim();
    if (!t) {
        return true;
    }
    if (/^http failure response for /i.test(t)) {
        return true;
    }
    if (/^İstek\s+işlenemedi\.?$/iu.test(t)) {
        return true;
    }
    if (/^İstek\s+başarısız\.?$/iu.test(t)) {
        return true;
    }
    if (/one or more validation errors occurred/i.test(t)) {
        return true;
    }
    if (/^validation failed/i.test(t)) {
        return true;
    }
    if (/^bad request$/i.test(t)) {
        return true;
    }
    return false;
}

/** Panel listeleri / formlar: ProblemDetails, düz metin ve HTTP durumuna göre anlamlı mesaj. */
export function messageFromHttpError(err: HttpErrorResponse, fallback = 'İstek başarısız.'): string {
    const body = err.error as ProblemDetails | string | null | undefined;
    if (body && typeof body === 'object') {
        const detail = typeof body.detail === 'string' ? body.detail.trim() : '';
        if (detail && !isUnhelpfulProblemText(detail)) {
            return detail;
        }
        const title = typeof body.title === 'string' ? body.title.trim() : '';
        if (title && !isUnhelpfulProblemText(title)) {
            return title;
        }
    }
    if (typeof body === 'string') {
        const t = body.trim();
        if (t && !isUnhelpfulProblemText(t)) {
            return t;
        }
    }

    const fromStatus = panelHttpStatusUserMessage(err.status);
    if (fromStatus) {
        return fromStatus;
    }

    if (err.message?.trim() && !isUnhelpfulProblemText(err.message)) {
        return err.message.trim();
    }
    return fallback;
}

/**
 * Bilinmeyen `catch` / subscribe hatası: HTTP ise gövde+ durum, değilse güvenli fallback.
 */
export function panelHttpFailureMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
        return messageFromHttpError(err, fallback);
    }
    if (err instanceof Error) {
        const m = err.message?.trim() ?? '';
        if (m && !isUnhelpfulProblemText(m)) {
            return m;
        }
    }
    return fallback;
}

function panelHttpStatusUserMessage(status: number): string | null {
    switch (status) {
        case 0:
            return 'Sunucuya ulaşılamıyor. Bağlantıyı kontrol edin.';
        case 400:
        case 422:
            return 'Gönderilen veri işlenemedi. Alanları kontrol edin veya yeniden deneyin.';
        case 401:
            return 'Oturum süresi dolmuş olabilir. Lütfen tekrar giriş yapın.';
        case 403:
            return 'Bu işlem için yetkiniz yok.';
        case 404:
            return 'İstenen kayıt bulunamadı.';
        case 405:
            return 'Bu işlem sunucu tarafından desteklenmiyor. Uygulama güncellemesi gerekebilir.';
        case 408:
        case 504:
            return 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.';
        case 409:
            return null;
        case 415:
            return 'İstek biçimi kabul edilmedi.';
        default:
            return null;
    }
}
