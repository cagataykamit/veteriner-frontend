import type { CashSummaryDayDto, DailyTransactionKind } from '@/app/features/reports/end-of-day/models/end-of-day.model';
import { addGregorianDaysToYmd } from '@/app/shared/utils/date.utils';

const KIND_LABELS: Record<DailyTransactionKind, string> = {
    Charge: 'Ücret',
    ChargeVoid: 'Ücret iptali',
    ChargeCorrection: 'Ücret düzeltmesi',
    Payment: 'Tahsilat',
    PaymentVoid: 'Tahsilat iptali',
    PaymentCorrection: 'Tahsilat düzeltmesi'
};

export const DAILY_TRANSACTION_KIND_OPTIONS = (Object.keys(KIND_LABELS) as DailyTransactionKind[]).map((value) => ({ label: KIND_LABELS[value], value }));

export const DAILY_TRANSACTION_METHOD_OPTIONS = [
    { label: 'Nakit', value: 'Cash' },
    { label: 'Kart', value: 'Card' },
    { label: 'Havale / EFT', value: 'Transfer' }
];

export function dailyTransactionKindLabel(kind: DailyTransactionKind): string {
    return KIND_LABELS[kind] ?? kind;
}

/** Satırın işaret türü: iptal ve düzeltme olayları tabloda rozetle ayrışır. */
export function dailyTransactionKindFlag(kind: DailyTransactionKind): 'void' | 'correction' | null {
    return kind.endsWith('Void') ? 'void' : kind.endsWith('Correction') ? 'correction' : null;
}

/** Tahsilat/ücret azalışı olan olaylar tabloda eksi işaretiyle yazılır (tutar pozitif gelir, yönü tür belirler). */
export function dailyTransactionSign(kind: DailyTransactionKind): '-' | '' {
    return kind === 'ChargeVoid' || kind === 'PaymentVoid' ? '-' : '';
}

/**
 * `byDay` yalnız hareketli günleri döner; seçilen aralığın boş günlerini sıfır satırla doldurur (en çok 366 gün).
 * Kural istemcidedir: backend sözleşmesi boş günleri doldurmaz.
 */
export function fillEmptyDays(from: string, to: string, byDay: readonly CashSummaryDayDto[]): CashSummaryDayDto[] {
    const known = new Map(byDay.map((d) => [d.date, d]));
    const days: CashSummaryDayDto[] = [];
    for (let day: string | null = from; day && day <= to && days.length < 366; day = addGregorianDaysToYmd(day, 1)) {
        days.push(
            known.get(day) ?? {
                date: day,
                collectedAmount: 0,
                collectedCount: 0,
                voidedAmount: 0,
                voidedCount: 0,
                netAmount: 0,
                salesCollectedAmount: 0,
                cashNetAmount: 0,
                cardNetAmount: 0,
                transferNetAmount: 0
            }
        );
    }
    return days;
}
