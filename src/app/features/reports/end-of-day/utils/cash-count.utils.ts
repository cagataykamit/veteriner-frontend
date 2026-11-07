import { localDateYyyyMmDd } from '@/app/shared/utils/date.utils';

/** Kuruş hassasiyeti; kayıtlı sayımın farkı sunucudan gelir, bu yalnız formdaki önizlemedir. */
function cents(n: number): number {
    return Math.round(n * 100) / 100;
}

/** Olması gereken = açılış + günün nakit neti; fark = sayılan − olması gereken (`CASH_COUNT_API_CONTRACT.md` §1). */
export function cashCountPreview(opening: number | null, expectedCash: number, counted: number | null): { closing: number | null; difference: number | null } {
    if (opening === null) {
        return { closing: null, difference: null };
    }

    const closing = cents(opening + expectedCash);

    return { closing, difference: counted === null ? null : cents(counted - closing) };
}

export type CashCountDifferenceTone = 'even' | 'over' | 'short';

export function cashCountDifferenceTone(difference: number): CashCountDifferenceTone {
    return difference === 0 ? 'even' : difference > 0 ? 'over' : 'short';
}

export function cashCountDifferenceLabel(difference: number): string {
    const tone = cashCountDifferenceTone(difference);

    return tone === 'even' ? 'Kasa tutuyor' : tone === 'over' ? 'Kasa fazlası' : 'Kasa açığı';
}

/** `yyyy-MM-dd` gününden `days` gün önce (yerel takvim). */
export function ymdDaysBefore(ymd: string, days: number): string {
    const [y, m, d] = ymd.split('-').map(Number);

    return localDateYyyyMmDd(new Date(y, m - 1, d - days));
}
