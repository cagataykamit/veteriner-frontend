import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { fromIstanbulDateTimeLocalInputToUtcIso, toIstanbulDateTimeLocalInputValue } from '@/app/shared/utils/date.utils';

/** Sonuç tarihi en fazla bu kadar gün geçmişe girilebilir (backend ile uyumlu). */
export const LAB_RESULT_DATE_MAX_PAST_DAYS = 7;

export const LAB_RESULT_DATE_TOO_FAR_PAST_ERROR_KEY = 'labResultDateTooFarPast';

export const LAB_RESULT_DATE_TOO_FAR_PAST_MESSAGE = 'Sonuç tarihi en fazla 7 gün geçmişe girilebilir.';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** `datetime-local` HTML min — en fazla 7 gün önce (Istanbul duvar saati). */
export function labResultDateTimeLocalMinAllowed(): string {
    const earliestMs = Date.now() - LAB_RESULT_DATE_MAX_PAST_DAYS * MS_PER_DAY;
    return toIstanbulDateTimeLocalInputValue(new Date(earliestMs).toISOString());
}

/** Istanbul `datetime-local` → UTC anı 7 günden daha eski mi? */
export function isLabResultDateTimeLocalTooFarPast(localDateTime: string): boolean {
    const trimmed = localDateTime.trim();
    if (!trimmed) {
        return false;
    }
    const iso = fromIstanbulDateTimeLocalInputToUtcIso(trimmed);
    if (!iso) {
        return false;
    }
    const earliestAllowedMs = Date.now() - LAB_RESULT_DATE_MAX_PAST_DAYS * MS_PER_DAY;
    return new Date(iso).getTime() < earliestAllowedMs;
}

/** Reactive form — sonuç tarihi en fazla 7 gün geçmişe. */
export function labResultDateNotTooFarPastValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const v = (control.value ?? '').toString().trim();
        if (!v) {
            return null;
        }
        return isLabResultDateTimeLocalTooFarPast(v) ? { [LAB_RESULT_DATE_TOO_FAR_PAST_ERROR_KEY]: true } : null;
    };
}

/** Backend İngilizce metin → sonuç tarihi çok eski hatası mı? */
export function isLabResultDateTooFarPastBackendMessage(message: string): boolean {
    const m = message.trim();
    if (!m) {
        return false;
    }
    return /too far in the past/i.test(m) && /7\s*days?/i.test(m);
}
