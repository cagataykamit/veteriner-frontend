import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

const FALLBACK_GENERIC = 'Kayıt sırasında hata oluştu.';
const FALLBACK_DUPLICATE = 'Aynı e-posta ve telefon bilgileriyle kayıtlı bir müşteri zaten var.';

/**
 * Müşteri oluşturma HTTP hataları — ProblemDetails `detail` / `title` öncelikli, 409 için duplicate fallback.
 */
export function messageFromClientCreateHttpError(err: HttpErrorResponse): string {
    const explicit = messageFromHttpError(err, '');
    if (explicit && explicit.trim()) {
        return explicit;
    }
    if (err.status === 409) {
        return FALLBACK_DUPLICATE;
    }
    return messageFromHttpError(err, FALLBACK_GENERIC);
}
