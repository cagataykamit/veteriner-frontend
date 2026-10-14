import type { CashSummaryDayDto } from '@/app/features/reports/end-of-day/models/end-of-day.model';
import { dailyTransactionKindFlag, dailyTransactionKindLabel, dailyTransactionSign, fillEmptyDays } from './end-of-day.utils';

describe('end-of-day.utils', () => {
    const day = (date: string, net: number): CashSummaryDayDto => ({
        date,
        collectedAmount: net,
        collectedCount: 1,
        voidedAmount: 0,
        voidedCount: 0,
        netAmount: net,
        salesCollectedAmount: 0,
        cashNetAmount: net,
        cardNetAmount: 0,
        transferNetAmount: 0
    });

    it('byDay yalnız hareketli günleri içerir; boş günler sıfır satırla dolar', () => {
        const days = fillEmptyDays('2026-10-01', '2026-10-04', [day('2026-10-02', 100), day('2026-10-04', 50)]);
        expect(days.map((d) => d.date)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
        expect(days.map((d) => d.netAmount)).toEqual([0, 100, 0, 50]);
    });

    it('tek gün ve boş byDay: tek sıfır satır', () => {
        expect(fillEmptyDays('2026-10-01', '2026-10-01', []).map((d) => d.netAmount)).toEqual([0]);
    });

    it('ay sonu ve yıl sonu sınırını geçer', () => {
        expect(fillEmptyDays('2026-12-30', '2027-01-01', []).map((d) => d.date)).toEqual(['2026-12-30', '2026-12-31', '2027-01-01']);
    });

    it('tür etiketleri, iptal/düzeltme işareti ve eksi işareti', () => {
        expect(dailyTransactionKindLabel('PaymentVoid')).toBe('Tahsilat iptali');
        expect(dailyTransactionKindLabel('ChargeCorrection')).toBe('Ücret düzeltmesi');
        expect(dailyTransactionKindFlag('ChargeVoid')).toBe('void');
        expect(dailyTransactionKindFlag('PaymentCorrection')).toBe('correction');
        expect(dailyTransactionKindFlag('Payment')).toBeNull();
        expect(dailyTransactionSign('PaymentVoid')).toBe('-');
        expect(dailyTransactionSign('Charge')).toBe('');
    });
});
