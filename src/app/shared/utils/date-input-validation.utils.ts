import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { dateOnlyInputToUtcIso, fromIstanbulDateTimeLocalInputToUtcIso } from '@/app/shared/utils/date.utils';

/** HTML `type="date"` — yıl 4 hane sınırı (iş kuralı tabanı). */
export const DATE_INPUT_MIN = '1900-01-01';

/** HTML `type="date"` — yıl 4 hane üst sınırı. */
export const DATE_INPUT_MAX = '9999-12-31';

/** HTML `type="datetime-local"` — yıl 4 hane sınırı (iş kuralı tabanı). */
export const DATETIME_LOCAL_INPUT_MIN = '1900-01-01T00:00';

/** HTML `type="datetime-local"` — yıl 4 hane üst sınırı. */
export const DATETIME_LOCAL_INPUT_MAX = '9999-12-31T23:59';

export const DATE_YEAR_INVALID_ERROR_KEY = 'dateYearInvalid';

export const DATE_INPUT_YEAR_RANGE_ERROR = 'Yıl 4 haneli olmalıdır.';

const MIN_YEAR = 1000;
const MAX_YEAR = 9999;

function yearRangeError(): ValidationErrors {
    return { [DATE_YEAR_INVALID_ERROR_KEY]: true };
}

function normalizeDateTimeLocalRaw(value: string): string {
    let s = value.trim();

    if (s.includes(' ') && !s.includes('T')) {
        s = s.replace(' ', 'T');
    }

    return s;
}

/** Boş değilse yıl tam 4 hane ve [1000, 9999] aralığında olmalı; takvim geçerli olmalı. */
export function validateDateInputYearRange(value: string | null | undefined): ValidationErrors | null {
    const v = (value ?? '').toString().trim();

    if (v === '') {
        return null;
    }

    const match = /^(\d+)-(\d{2})-(\d{2})$/.exec(v);

    if (!match) {
        return yearRangeError();
    }

    const yearStr = match[1];

    if (yearStr.length !== 4) {
        return yearRangeError();
    }

    const y = Number(yearStr);

    if (!Number.isFinite(y) || y < MIN_YEAR || y > MAX_YEAR) {
        return yearRangeError();
    }

    const iso = dateOnlyInputToUtcIso(v);

    if (!iso) {
        return yearRangeError();
    }

    return null;
}

/** Boş değilse `datetime-local` yıl tam 4 hane ve parse edilebilir olmalı. */
export function validateDateTimeLocalInputYearRange(value: string | null | undefined): ValidationErrors | null {
    const v = (value ?? '').toString().trim();

    if (v === '') {
        return null;
    }

    const normalized = normalizeDateTimeLocalRaw(v);
    const tIdx = normalized.indexOf('T');

    if (tIdx < 0) {
        return yearRangeError();
    }

    const datePart = normalized.slice(0, tIdx);
    const timePart = normalized.slice(tIdx + 1);
    const dateError = validateDateInputYearRange(datePart);

    if (dateError) {
        return dateError;
    }

    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(timePart)) {
        return yearRangeError();
    }

    const iso = fromIstanbulDateTimeLocalInputToUtcIso(normalized);

    if (!iso) {
        return yearRangeError();
    }

    return null;
}

/** Reactive form — `type="date"`. */
export function dateYearRangeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => validateDateInputYearRange(control.value);
}

/** Reactive form — `type="datetime-local"`. */
export function dateTimeYearRangeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => validateDateTimeLocalInputYearRange(control.value);
}

/** Mevcut iş kuralı min ile taban min birleştirilir (daha kısıtlayıcı olan). */
export function effectiveDateInputMin(existingMin?: string | null): string {
    const existing = existingMin?.trim() ?? '';

    if (!existing) {
        return DATE_INPUT_MIN;
    }

    return existing >= DATE_INPUT_MIN ? existing : DATE_INPUT_MIN;
}

/** Mevcut iş kuralı max ile üst sınır birleştirilir (9999'u aşmaz). */
export function effectiveDateInputMax(existingMax?: string | null): string {
    const existing = existingMax?.trim() ?? '';

    if (!existing) {
        return DATE_INPUT_MAX;
    }

    return existing <= DATE_INPUT_MAX ? existing : DATE_INPUT_MAX;
}

/** Mevcut iş kuralı min ile taban min birleştirilir (datetime-local). */
export function effectiveDateTimeLocalInputMin(existingMin?: string | null): string {
    const existing = existingMin?.trim() ?? '';

    if (!existing) {
        return DATETIME_LOCAL_INPUT_MIN;
    }

    return existing >= DATETIME_LOCAL_INPUT_MIN ? existing : DATETIME_LOCAL_INPUT_MIN;
}

/** Mevcut iş kuralı max ile üst sınır birleştirilir (datetime-local). */
export function effectiveDateTimeLocalInputMax(existingMax?: string | null): string {
    const existing = existingMax?.trim() ?? '';

    if (!existing) {
        return DATETIME_LOCAL_INPUT_MAX;
    }

    return existing <= DATETIME_LOCAL_INPUT_MAX ? existing : DATETIME_LOCAL_INPUT_MAX;
}
