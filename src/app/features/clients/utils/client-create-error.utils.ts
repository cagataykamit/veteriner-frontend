import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

const FALLBACK_GENERIC = 'Kayıt sırasında hata oluştu.';

/**
 * 409 `Clients.DuplicateClient` veya anlamlı `detail` yokken — backend hard duplicate:
 * aynı ad-soyad + aynı e-posta veya aynı ad-soyad + aynı telefon.
 */
const DUPLICATE_CLIENT_USER_MESSAGE =
    'Bu müşteri zaten kayıtlı görünüyor. Aynı ad-soyad ile aynı e-posta veya aynı ad-soyad ile aynı telefon tekrar kullanılamaz.';

/** ASP.NET varsayılan kısa başlıklar; kullanıcıya yetersiz — genel duplicate metnine düşülür. */
function isWeak409ConflictText(s: string): boolean {
    const t = s.trim();
    return /^conflict$/i.test(t) || /^duplicate$/i.test(t) || /^gone$/i.test(t);
}

/**
 * Müşteri create/update HTTP hataları — ProblemDetails `detail` / `title` öncelikli;
 * 409’da anlamlı metin yoksa veya yalnızca genel `Conflict`/`Duplicate` başlığı varsa
 * `Clients.DuplicateClient` kuralına uygun geniş Türkçe mesaj.
 */
export function messageFromClientCreateHttpError(err: HttpErrorResponse): string {
    const explicit = messageFromHttpError(err, '').trim();
    if (explicit) {
        if (err.status === 409 && isWeak409ConflictText(explicit)) {
            return DUPLICATE_CLIENT_USER_MESSAGE;
        }
        return explicit;
    }
    if (err.status === 409) {
        return DUPLICATE_CLIENT_USER_MESSAGE;
    }
    return messageFromHttpError(err, FALLBACK_GENERIC);
}
