import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

const FALLBACK_GENERIC = 'Kayıt sırasında hata oluştu.';

/** Anlamlı `detail` yokken veya yalnızca genel çatışma başlığı — backend kurallarına özel iddia yok. */
const DUPLICATE_PET_USER_MESSAGE =
    'Bu hayvan kaydı şu an kaydedilemedi; sunucu bir çakışma bildirdi. Bilgileri kontrol edip tekrar deneyin.';

function isWeak409ConflictText(s: string): boolean {
    const t = s.trim();
    return /^conflict$/i.test(t) || /^duplicate$/i.test(t) || /^gone$/i.test(t);
}

/**
 * Hayvan create/update HTTP hataları — ProblemDetails `detail` / `title` öncelikli;
 * 409’da anlamlı metin yoksa veya yalnızca zayıf çatışma başlığı varsa `DUPLICATE_PET_USER_MESSAGE` (Clients create error util ile aynı desen).
 */
export function messageFromPetCreateHttpError(err: HttpErrorResponse): string {
    const explicit = messageFromHttpError(err, '').trim();
    if (explicit) {
        if (err.status === 409 && isWeak409ConflictText(explicit)) {
            return DUPLICATE_PET_USER_MESSAGE;
        }
        return explicit;
    }
    if (err.status === 409) {
        return DUPLICATE_PET_USER_MESSAGE;
    }
    return messageFromHttpError(err, FALLBACK_GENERIC);
}
