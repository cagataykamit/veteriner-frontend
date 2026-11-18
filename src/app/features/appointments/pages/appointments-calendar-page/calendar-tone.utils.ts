import type { AppointmentCalendarItemVm } from '@/app/entities/appointment/models/appointment-calendar-vm.model';
import { parseAppointmentStatusRawToEnum } from '@/app/entities/appointment/utils/appointment-status.utils';
import type { CalendarItemState, VaccinationCalendarItemVm } from '@/app/entities/vaccination/models/vaccination-calendar.model';

/**
 * Takvim renk dili (ux/takvim-yeniden-tasarim.md, kullanıcı seçimi 2026-11-16 ve 2026-11-18): durum = renk (yalnız sol şerit ve simge),
 * tür = biçim. Gelecek koyu, bugün sarı, gecikmiş kırmızı (zemin yalnız burada), tamamlanan yeşil ve soluk, gelmedi/iptal gri ve üstü
 * çizili. Klinikte bekleyen sarı zemin, muayenedeki koyu ana renk. Renk sınıflarının tek yeri burasıdır.
 */
export type CalendarTone = 'up' | 'today' | 'overdue' | 'done' | 'off' | 'wait' | 'room';

/** Kabul kuyruğundaki durum (Bugün sayfasıyla aynı kaynak: `GET /visits/today`). */
export type CareMark = { kind: 'wait'; since: string | null } | { kind: 'room' };

export function stateTone(state: CalendarItemState | null): CalendarTone {
    switch (state) {
        case 'DueToday':
            return 'today';
        case 'Overdue':
            return 'overdue';
        case 'Completed':
            return 'done';
        case 'Upcoming':
            return 'up';
        default:
            return 'off';
    }
}

/** Randevu: kabul durumu (bekliyor / muayenede) planlı randevunun gün durumunun önüne geçer. */
export function appointmentTone(item: AppointmentCalendarItemVm, care?: CareMark | null): CalendarTone {
    if (care && item.state !== null && item.state !== 'Completed') {
        return care.kind;
    }

    return stateTone(item.state ?? legacyState(item));
}

export function vaccineTone(v: VaccinationCalendarItemVm): CalendarTone {
    return stateTone(v.state);
}

/** Kart: çerçeve, sol şerit ve zemin. */
const CARD: Record<CalendarTone, string> = {
    up: 'bg-surface-0 dark:bg-surface-900 border-surface border-l-surface-800 dark:border-l-surface-200',
    today: 'bg-surface-0 dark:bg-surface-900 border-surface border-l-amber-500',
    overdue: 'bg-red-50 dark:bg-red-950/50 border-surface border-l-red-600 dark:border-l-red-400',
    done: 'bg-surface-50 dark:bg-surface-800 border-surface border-l-green-600 dark:border-l-green-500 opacity-70 shadow-none',
    off: 'bg-surface-50 dark:bg-surface-800 border-surface border-l-surface-400 opacity-70 shadow-none',
    wait: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 border-l-amber-500',
    room: 'bg-primary border-primary text-primary-contrast shadow-md'
};

/** Renk açıklaması ve filtre çipi şeridi (kartlardaki şeritle aynı renk). */
const BAR: Record<CalendarTone, string> = {
    up: 'bg-surface-800 dark:bg-surface-200',
    today: 'bg-amber-500',
    overdue: 'bg-red-600 dark:bg-red-400',
    done: 'bg-green-600 dark:bg-green-500',
    off: 'bg-surface-400',
    wait: 'bg-amber-500',
    room: 'bg-primary'
};

export function toneCardClass(tone: CalendarTone): string {
    return CARD[tone];
}

export function toneBarClass(tone: CalendarTone): string {
    return BAR[tone];
}


/** Hekim baş harfleri ("Dr. Ece Arslan" → "EA"); nötr rozet (hekim başına renk yok). */
export function initials(name: string | null | undefined): string {
    const words = (name ?? '')
        .replace(/^(dr|vet|uzm)\.?\s+/i, '')
        .split(/\s+/)
        .filter((w) => !!w);

    if (words.length === 0) {
        return '–';
    }

    return ((words[0][0] ?? '') + (words.length > 1 ? (words.at(-1)![0] ?? '') : '')).toLocaleUpperCase('tr');
}

/** Sunucu durumu gelmezse (eski yanıt) randevu durumundan: iptal/gelmedi durumsuz. */
function legacyState(item: AppointmentCalendarItemVm): CalendarItemState | null {
    const s = typeof item.status === 'number' ? item.status : parseAppointmentStatusRawToEnum(item.status);

    return s === 1 ? 'Completed' : s === 0 ? 'Upcoming' : null;
}
