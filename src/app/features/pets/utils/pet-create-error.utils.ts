import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

const FALLBACK_GENERIC = 'Kayıt sırasında hata oluştu.';

/**
 * Hayvan oluşturma HTTP hataları — ProblemDetails `detail` / `title` öncelikli; boşsa 409 için kısa çakışma metni.
 */
export function messageFromPetCreateHttpError(err: HttpErrorResponse): string {
    const explicit = messageFromHttpError(err, '');
    if (explicit && explicit.trim()) {
        return explicit;
    }
    if (err.status === 409) {
        return 'Bu kayıt oluşturulamadı (çakışma). Lütfen bilgileri kontrol edin.';
    }
    return messageFromHttpError(err, FALLBACK_GENERIC);
}
