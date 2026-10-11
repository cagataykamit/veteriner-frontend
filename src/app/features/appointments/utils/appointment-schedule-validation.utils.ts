import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { addGregorianDaysToYmd, fromIstanbulDateAndTimeToUtcIso, toIstanbulDateInputValue } from '@/app/shared/utils/date.utils';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';

export const APPOINTMENT_NOTES_MAX_LENGTH = 2000;

/** Backend `AppointmentScheduleWindow`: randevu zamanı şimdiden en fazla bu kadar gün öncesine kadar açılabilir. */
export const APPOINTMENT_MAX_PAST_DAYS = 7;

/** Backend `AppointmentScheduleWindow`: randevu zamanı şimdiden en fazla bu kadar yıl ileriye planlanabilir. */
export const APPOINTMENT_MAX_FUTURE_YEARS = 2;

/** Backend `Appointments.ScheduledTooFarInFuture` ile aynı metin. */
export const APPOINTMENT_TOO_FAR_FUTURE_MESSAGE = 'Randevu zamanı en fazla 2 yıl ileriye planlanabilir.';

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

/** Randevu için seçilebilecek en geç takvim günü (İstanbul): bugünden 2 yıl sonra. */
export function appointmentLatestDateYmd(): string {
    const [y, m, d] = istanbulTodayYmd().split('-').map(Number);
    const latest = new Date(Date.UTC(y + APPOINTMENT_MAX_FUTURE_YEARS, m - 1, d));
    return latest.toISOString().slice(0, 10);
}

/** Seçilen İstanbul tarih+saati backend penceresinin (şimdi − 7 gün) dışında mı? Bugünün geçmiş saatleri geçerlidir. */
export function isIstanbulDateTimeTooFarInPast(dateYmd: string, timeHm: string, nowMs: number = Date.now()): boolean {
    const utc = fromIstanbulDateAndTimeToUtcIso(dateYmd.trim(), timeHm.trim());
    if (!utc) {
        return false;
    }
    return new Date(utc).getTime() < nowMs - APPOINTMENT_MAX_PAST_DAYS * 24 * 60 * 60 * 1000;
}

/** Seçilen İstanbul tarih+saati backend penceresinin (şimdi + 2 yıl) ötesinde mi? */
export function isIstanbulDateTimeTooFarInFuture(dateYmd: string, timeHm: string, nowMs: number = Date.now()): boolean {
    const utc = fromIstanbulDateAndTimeToUtcIso(dateYmd.trim(), timeHm.trim());
    if (!utc) {
        return false;
    }
    const limit = new Date(nowMs);
    limit.setUTCFullYear(limit.getUTCFullYear() + APPOINTMENT_MAX_FUTURE_YEARS);
    return new Date(utc).getTime() > limit.getTime();
}

/** Yeni randevu formu — 7 günden eski veya 2 yıldan ileri takvim gününü reddeder (bugün ve yakın geçmiş serbest). */
export function appointmentCreateScheduleDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const v = typeof control.value === 'string' ? control.value.trim() : '';
        if (!v) {
            return null;
        }
        if (v < appointmentEarliestDateYmd()) {
            return { tooFarPast: true };
        }
        return v > appointmentLatestDateYmd() ? { tooFarFuture: true } : null;
    };
}

/** Backend penceresinin (şimdi − 7 gün … şimdi + 2 yıl) dışında kalan saat slotlarını çıkarır (yalnız sınır günleri etkilenir). */
export function filterAllowedIstanbulTimeOptions(dateYmd: string, options: SelectOption[]): SelectOption[] {
    const date = dateYmd.trim();
    if (!date) {
        return options;
    }
    return options.filter((o) => !isIstanbulDateTimeTooFarInPast(date, o.value) && !isIstanbulDateTimeTooFarInFuture(date, o.value));
}
