import { addGregorianDaysToYmd } from '@/app/shared/utils/date.utils';

/** Randevu listesinin dönemi: yaklaşan (bugünden itibaren), geçmiş (bugünden önce) ya da tümü. */
export type AppointmentListPeriod = 'upcoming' | 'past' | 'all';

const PERIODS: readonly AppointmentListPeriod[] = ['upcoming', 'past', 'all'];
/** Seçim bu tarayıcıda saklanır (Bugün listesindeki seçim hatırlamayla aynı desen). */
const STORAGE_KEY = 'vetinity.appointments.period';

/** Kayıtlı dönem; yoksa yaklaşan. */
export function readAppointmentListPeriod(): AppointmentListPeriod {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);

        return PERIODS.find((p) => p === stored) ?? 'upcoming';
    } catch {
        return 'upcoming';
    }
}

export function writeAppointmentListPeriod(period: AppointmentListPeriod): void {
    try {
        localStorage.setItem(STORAGE_KEY, period);
    } catch {
        /* Depo kapalıysa seçim yalnız bu sayfada kalır. */
    }
}

export interface AppointmentListWindow {
    /** İstanbul günü (`yyyy-MM-dd`); başlangıç günün başı, bitiş günün sonu. */
    fromDate?: string;
    toDate?: string;
    order: 'asc' | 'desc';
}

/**
 * Listenin tarih penceresi ve sırası. Girilen tarih aralığı dönemin yerine geçer ve artan sıralanır (aralık bir takvim gibi okunur).
 * Aralık yokken: yaklaşan bugünün başından itibaren artan (en yakın üstte), geçmiş dünün sonuna kadar azalan (en yeni üstte), tümü
 * azalan.
 */
export function appointmentListWindow(period: AppointmentListPeriod, range: { fromDate: string; toDate: string }, todayYmd: string): AppointmentListWindow {
    if (range.fromDate || range.toDate) {
        return { fromDate: range.fromDate || undefined, toDate: range.toDate || undefined, order: 'asc' };
    }

    switch (period) {
        case 'upcoming':
            return { fromDate: todayYmd, order: 'asc' };
        case 'past':
            return { toDate: addGregorianDaysToYmd(todayYmd, -1) ?? undefined, order: 'desc' };
        default:
            return { order: 'desc' };
    }
}
