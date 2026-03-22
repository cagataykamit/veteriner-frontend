import { HttpErrorResponse } from '@angular/common/http';
import type { ProblemDetails } from '@/app/shared/models/problem-details.model';

/** Panel listeleri / servisler: `ProblemDetails` ve düz metin için ortak mesaj. */
export function messageFromHttpError(err: HttpErrorResponse, fallback = 'İstek başarısız.'): string {
    const body = err.error as ProblemDetails | string | null | undefined;
    if (body && typeof body === 'object') {
        if (body.detail) {
            return body.detail;
        }
        if (body.title) {
            return body.title;
        }
    }
    if (typeof body === 'string' && body.trim()) {
        return body;
    }
    if (err.message) {
        return err.message;
    }
    return fallback;
}

/** Login ekranı: 429 rate limit, 401 ve ProblemDetails için kısa mesajlar. */
export function loginFailureMessage(err: HttpErrorResponse): string {
    if (err.status === 429) {
        const ra = err.headers.get('Retry-After');
        let waitHint = '';
        if (ra) {
            const sec = Number.parseInt(ra, 10);
            if (!Number.isNaN(sec)) {
                waitHint = ` Yaklaşık ${sec} saniye sonra tekrar deneyin.`;
            }
        }
        const fromApi = messageFromHttpError(err, '');
        const base =
            'Çok fazla istek (rate limit). Sunucu geçici olarak girişi sınırladı.' + (waitHint || ' Lütfen kısa süre sonra tekrar deneyin.');
        return fromApi && fromApi !== base ? `${base} (${fromApi})` : base;
    }
    if (err.status === 401) {
        const body = err.error as ProblemDetails | string | null | undefined;
        const hasProblemDetails =
            body && typeof body === 'object' && !!(body.detail?.trim() || body.title?.trim());
        if (hasProblemDetails) {
            return messageFromHttpError(err, 'Giriş reddedildi.');
        }
        return 'Giriş reddedildi. E-posta ve şifreyi kontrol edin. Çok kiracılı API kullanıyorsanız src/environments/environment.development.ts dosyasında authTenantId alanına tenant GUID girin (Swagger: LoginCommand.tenantId).';
    }
    if (err.status === 0) {
        return 'Sunucuya ulaşılamıyor. API adresini ve ağı kontrol edin.';
    }
    return messageFromHttpError(err, 'Giriş başarısız.');
}
