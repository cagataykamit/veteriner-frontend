import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { fromIstanbulDateTimeLocalInputToUtcIso, toIstanbulDateTimeLocalInputValue } from '@/app/shared/utils/date.utils';
import { formatDateInputDisplay, parseDateInputValue } from '@/app/shared/forms/date-input/date-input-value.utils';

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

export const HOSPITALIZATION_PLANNED_BEFORE_ADMISSION_ERROR_KEY = 'plannedDischargeBeforeAdmission';

/** Saat dahil: aynı gün içindeki hata "tarih doğru" gibi görünmesin. */
export function hospitalizationPlannedBeforeAdmissionMessage(admittedLocal: string | null | undefined): string {
    const admitted = parseDateInputValue('datetime-local', admittedLocal);
    return admitted ? `Planlı taburcu, yatış tarihinden (${formatDateInputDisplay('datetime-local', admitted)}) önce olamaz.` : 'Planlı taburcu, yatış tarihinden önce olamaz.';
}

const DATETIME_LOCAL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** Planlı taburcu için en erken değer: geçerli bir yatış tarihi varsa o, yoksa `fallbackMin` (`datetime-local` metni). */
export function hospitalizationPlannedDischargeMin(admittedLocal: string | null | undefined, fallbackMin: string): string {
    const admitted = (admittedLocal ?? '').trim();
    return DATETIME_LOCAL_RE.test(admitted) ? admitted : fallbackMin;
}

/** Form grubu — planlı taburcu yatış tarihinden önce olamaz (backend `PlannedDischargeBeforeAdmission` ile uyumlu). */
export function plannedDischargeNotBeforeAdmissionValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
        const admitted = (group.get('admittedAtLocal')?.value ?? '').toString().trim();
        const planned = (group.get('plannedDischargeAtLocal')?.value ?? '').toString().trim();
        if (!DATETIME_LOCAL_RE.test(admitted) || !DATETIME_LOCAL_RE.test(planned)) {
            return null;
        }
        return planned < admitted ? { [HOSPITALIZATION_PLANNED_BEFORE_ADMISSION_ERROR_KEY]: true } : null;
    };
}
