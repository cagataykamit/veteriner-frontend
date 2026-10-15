import { toIstanbulDateTimeLocalInputValue } from '@/app/shared/utils/date.utils';
import { type DateInputType, parseDateInputValue } from '@/app/shared/forms/date-input/date-input-value.utils';

/**
 * Tarih alanı üst sınır politikası (ürün kararı; tek yerde):
 * - `past`: gerçekleşmiş olay (doğum, muayene, ödeme, uygulanan aşı, geçmiş kayıt filtreleri) → en geç **şimdi** (Europe/Istanbul);
 * - `planned`: planlanan/ileri tarih (kontrol, planlı aşı, taburcu planı, davet bitişi, randevu/aşı filtreleri) → en geç **bugünden 5 yıl sonra**;
 * - `none`: sınır yok (yalnız açık `max` verilebilir).
 */
export type DateInputLimit = 'none' | 'past' | 'planned';

export const PLANNED_MAX_YEARS = 5;

/** Europe/Istanbul duvar saati (yerel değil): şu an. */
function istanbulNow(now: Date): Date {
    return parseDateInputValue('datetime-local', toIstanbulDateTimeLocalInputValue(now.toISOString())) ?? now;
}

/** `limit` için izin verilen en geç an; sınır yoksa (veya saat alanında) `null`. */
export function resolveLimitMax(type: DateInputType, limit: DateInputLimit, now: Date = new Date()): Date | null {
    if (limit === 'none' || type === 'time') {
        return null;
    }

    const wall = istanbulNow(now);

    if (limit === 'planned') {
        wall.setFullYear(wall.getFullYear() + PLANNED_MAX_YEARS);
    }

    if (type === 'date') {
        wall.setHours(0, 0, 0, 0); // tarih türünde gün başı karşılaştırılır
    }

    return wall;
}
