import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { addGregorianDaysToYmd, fromIstanbulDateAndTimeToUtcIso, toIstanbulDateInputValue } from '@/app/shared/utils/date.utils';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';

export const APPOINTMENT_NOTES_MAX_LENGTH = 2000;

/** Backend `AppointmentScheduleWindow`: randevu zamanı şimdiden en fazla bu kadar gün öncesine kadar açılabilir. */
export const APPOINTMENT_MAX_PAST_DAYS = 7;

/** Backend `Appointments.ScheduledTooFarInPast` ile aynı metin (gönderim öncesi yerel denetimde gösterilir). */
export const APPOINTMENT_TOO_FAR_PAST_MESSAGE = 'Randevu zamanı çok eski; en fazla 7 gün öncesine kadar kayıt açılabilir.';

/** Europe/Istanbul takvim günü (`yyyy-MM-dd`). */
export function istanbulTodayYmd(): string {
    return toIstanbulDateInputValue(new Date().toISOString());
}

/** Yeni randevuda seçilebilecek en erken takvim günü (İstanbul): bugünden 7 gün önce. */
export function appointmentEarliestDateYmd(): string {
    return addGregorianDaysToYmd(istanbulTodayYmd(), -APPOINTMENT_MAX_PAST_DAYS) ?? istanbulTodayYmd();
}

/** Seçilen İstanbul tarih+saati backend penceresinin (şimdi − 7 gün) dışında mı? Bugünün geçmiş saatleri geçerlidir. */
export function isIstanbulDateTimeTooFarInPast(dateYmd: string, timeHm: string, nowMs: number = Date.now()): boolean {
    const utc = fromIstanbulDateAndTimeToUtcIso(dateYmd.trim(), timeHm.trim());
    if (!utc) {
        return false;
    }
    return new Date(utc).getTime() < nowMs - APPOINTMENT_MAX_PAST_DAYS * 24 * 60 * 60 * 1000;
}

/** Yeni randevu formu — 7 günden eski takvim gününü reddeder (bugün ve yakın geçmiş serbest). */
export function appointmentCreateTooFarPastDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const v = typeof control.value === 'string' ? control.value.trim() : '';
        if (!v) {
            return null;
        }
        return v < appointmentEarliestDateYmd() ? { tooFarPast: true } : null;
    };
}

/** Backend penceresinin dışında kalan saat slotlarını çıkarır (yalnız sınır günü etkilenir). */
export function filterAllowedIstanbulTimeOptions(dateYmd: string, options: SelectOption[]): SelectOption[] {
    const date = dateYmd.trim();
    if (!date) {
        return options;
    }
    return options.filter((o) => !isIstanbulDateTimeTooFarInPast(date, o.value));
}
