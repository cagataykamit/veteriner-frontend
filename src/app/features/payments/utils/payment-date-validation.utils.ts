import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { fromIstanbulDateTimeLocalInputToUtcIso, toIstanbulDateTimeLocalInputValue } from '@/app/shared/utils/date.utils';

/** Ödeme zamanı en fazla bu kadar gün geçmişe girilebilir (backend ile uyumlu). */
export const PAYMENT_DATE_MAX_PAST_DAYS = 7;

export const PAYMENT_DATE_TOO_FAR_PAST_ERROR_KEY = 'paymentDateTooFarPast';

export const PAYMENT_DATE_TOO_FAR_PAST_MESSAGE =
    'Ödeme zamanı çok eski; en fazla 7 gün öncesine kadar kayıt açılabilir.';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** `datetime-local` HTML min — en fazla 7 gün önce (Istanbul duvar saati). */
export function paymentDateTimeLocalMinAllowed(): string {
    const earliestMs = Date.now() - PAYMENT_DATE_MAX_PAST_DAYS * MS_PER_DAY;
    return toIstanbulDateTimeLocalInputValue(new Date(earliestMs).toISOString());
}

/** Istanbul `datetime-local` → UTC anı 7 günden daha eski mi? */
export function isPaymentDateTimeLocalTooFarPast(localDateTime: string): boolean {
    const trimmed = localDateTime.trim();
    if (!trimmed) {
        return false;
    }
    const iso = fromIstanbulDateTimeLocalInputToUtcIso(trimmed);
    if (!iso) {
        return false;
    }
    const earliestAllowedMs = Date.now() - PAYMENT_DATE_MAX_PAST_DAYS * MS_PER_DAY;
    return new Date(iso).getTime() < earliestAllowedMs;
}

/** Reactive form — ödeme zamanı en fazla 7 gün geçmişe. */
export function paymentDateNotTooFarPastValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const v = (control.value ?? '').toString().trim();
        if (!v) {
            return null;
        }
        return isPaymentDateTimeLocalTooFarPast(v) ? { [PAYMENT_DATE_TOO_FAR_PAST_ERROR_KEY]: true } : null;
    };
}

/** Backend metin (İngilizce veya Türkçe) → ödeme zamanı çok eski hatası mı? */
export function isPaymentDateTooFarPastBackendMessage(message: string): boolean {
    const m = message.trim();
    if (!m) {
        return false;
    }
    if (/too far in the past/i.test(m) && /7\s*days?/i.test(m)) {
        return true;
    }
    return /çok eski/i.test(m) && /7\s*gün/i.test(m);
}
