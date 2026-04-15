import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

const FALLBACK_GENERIC = 'Kayıt sırasında hata oluştu.';

const APPOINTMENT_CONFLICT_USER_MESSAGE =
    'Randevu kaydedilemedi. Aynı zaman diliminde çakışan bir kayıt olabilir; tarih/saat ve seçimleri kontrol edip tekrar deneyin.';

function isWeak409ConflictText(s: string): boolean {
    const t = s.trim();
    return /^conflict$/i.test(t) || /^duplicate$/i.test(t) || /^gone$/i.test(t);
}

/**
 * Appointment create/update HTTP hataları:
 * anlamlı `detail`/`title` korunur; 409'da yalnızca zayıf başlık varsa kullanıcı dostu çakışma metnine düşer.
 */
export function messageFromAppointmentUpsertHttpError(err: HttpErrorResponse): string {
    const explicit = messageFromHttpError(err, '').trim();
    if (explicit) {
        if (err.status === 409 && isWeak409ConflictText(explicit)) {
            return APPOINTMENT_CONFLICT_USER_MESSAGE;
        }
        return explicit;
    }
    if (err.status === 409) {
        return APPOINTMENT_CONFLICT_USER_MESSAGE;
    }
    return messageFromHttpError(err, FALLBACK_GENERIC);
}
