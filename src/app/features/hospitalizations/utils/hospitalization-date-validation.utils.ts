import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { fromIstanbulDateTimeLocalInputToUtcIso, toIstanbulDateTimeLocalInputValue } from '@/app/shared/utils/date.utils';

/** Yatış tarihi en fazla bu kadar gün geçmişe girilebilir (backend ile uyumlu). */
export const HOSPITALIZATION_DATE_MAX_PAST_DAYS = 7;

export const HOSPITALIZATION_DATE_TOO_FAR_PAST_ERROR_KEY = 'hospitalizationDateTooFarPast';

export const HOSPITALIZATION_DATE_TOO_FAR_PAST_MESSAGE = 'Yatış tarihi en fazla 7 gün geçmişe girilebilir.';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** `datetime-local` HTML min — en fazla 7 gün önce (Istanbul duvar saati). */
export function hospitalizationDateTimeLocalMinAllowed(): string {
    const earliestMs = Date.now() - HOSPITALIZATION_DATE_MAX_PAST_DAYS * MS_PER_DAY;
    return toIstanbulDateTimeLocalInputValue(new Date(earliestMs).toISOString());
}

/** Istanbul `datetime-local` → UTC anı 7 günden daha eski mi? */
export function isHospitalizationDateTimeLocalTooFarPast(localDateTime: string): boolean {
    const trimmed = localDateTime.trim();
    if (!trimmed) {
        return false;
    }
    const iso = fromIstanbulDateTimeLocalInputToUtcIso(trimmed);
    if (!iso) {
        return false;
    }
    const earliestAllowedMs = Date.now() - HOSPITALIZATION_DATE_MAX_PAST_DAYS * MS_PER_DAY;
    return new Date(iso).getTime() < earliestAllowedMs;
}

/** Reactive form — yatış tarihi en fazla 7 gün geçmişe. */
export function hospitalizationDateNotTooFarPastValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const v = (control.value ?? '').toString().trim();
        if (!v) {
            return null;
        }
        return isHospitalizationDateTimeLocalTooFarPast(v) ? { [HOSPITALIZATION_DATE_TOO_FAR_PAST_ERROR_KEY]: true } : null;
    };
}

/** Backend İngilizce metin → yatış tarihi çok eski hatası mı? */
export function isHospitalizationDateTooFarPastBackendMessage(message: string): boolean {
    const m = message.trim();
    if (!m) {
        return false;
    }
    return /too far in the past/i.test(m) && /7\s*days?/i.test(m);
}
