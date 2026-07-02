import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { fromIstanbulDateAndTimeToUtcIso, toIstanbulDateInputValue } from '@/app/shared/utils/date.utils';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';

export const APPOINTMENT_NOTES_MAX_LENGTH = 2000;

/** Europe/Istanbul takvim günü (`yyyy-MM-dd`) — yeni randevu min tarih. */
export function istanbulTodayYmd(): string {
    return toIstanbulDateInputValue(new Date().toISOString());
}

export function isIstanbulDateBeforeToday(ymd: string): boolean {
    const trimmed = ymd.trim();
    if (!trimmed) {
        return false;
    }
    return trimmed < istanbulTodayYmd();
}

export function isIstanbulDateTimeInPast(dateYmd: string, timeHm: string): boolean {
    const utc = fromIstanbulDateAndTimeToUtcIso(dateYmd.trim(), timeHm.trim());
    if (!utc) {
        return false;
    }
    return new Date(utc).getTime() <= Date.now();
}

/** Yalnızca yeni randevu create formu — geçmiş takvim gününü reddeder. */
export function appointmentCreatePastDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const v = typeof control.value === 'string' ? control.value.trim() : '';
        if (!v) {
            return null;
        }
        return isIstanbulDateBeforeToday(v) ? { pastDate: true } : null;
    };
}

/** Bugün seçiliyken geçmiş saat slotlarını çıkarır (create). */
export function filterFutureIstanbulTimeOptions(dateYmd: string, options: SelectOption[]): SelectOption[] {
    const date = dateYmd.trim();
    if (!date || date !== istanbulTodayYmd()) {
        return options;
    }
    return options.filter((o) => !isIstanbulDateTimeInPast(date, o.value));
}
