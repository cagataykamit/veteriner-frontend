import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

/** Login ekranı — mevcut loginFailureMessage ile uyumlu. */
export { loginFailureMessage } from '@/app/shared/utils/api-error.utils';

/**
 * Refresh veya oturum kaybı sonrası genel mesaj.
 * Detay için önce ProblemDetails, yoksa status.
 */
export function authRefreshFailureMessage(err: unknown, fallback = 'Oturum yenilenemedi. Lütfen tekrar giriş yapın.'): string {
    if (err instanceof HttpErrorResponse) {
        if (err.status === 0) {
            return 'Sunucuya ulaşılamıyor. Ağı kontrol edin.';
        }
        return messageFromHttpError(err, fallback);
    }
    if (err instanceof Error) {
        return err.message || fallback;
    }
    return fallback;
}

export const AUTH_TENANT_SELECT_REQUIRED_MESSAGE = 'Bu hesap birden fazla kiracıya bağlı. Devam etmek için kiracı seçin.';
