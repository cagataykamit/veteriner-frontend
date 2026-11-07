import { cashCountDifferenceLabel, cashCountDifferenceTone, cashCountPreview, ymdDaysBefore } from './cash-count.utils';

describe('cash-count.utils', () => {
    it('olması gereken açılış + nakit neti, fark sayılan − olması gereken (kuruşta yuvarlı)', () => {
        expect(cashCountPreview(200, 620.1, 815.2)).toEqual({ closing: 820.1, difference: -4.9 });
        expect(cashCountPreview(0.1, 0.2, 0.3)).toEqual({ closing: 0.3, difference: 0 });
        expect(cashCountPreview(100, -150, 0)).toEqual({ closing: -50, difference: 50 });
    });

    it('açılış ya da sayılan yoksa eksik alan boş kalır', () => {
        expect(cashCountPreview(null, 500, 100)).toEqual({ closing: null, difference: null });
        expect(cashCountPreview(100, 500, null)).toEqual({ closing: 600, difference: null });
    });

    it('fark etiketi ve tonu', () => {
        expect(cashCountDifferenceTone(0)).toBe('even');
        expect(cashCountDifferenceLabel(0)).toBe('Kasa tutuyor');
        expect(cashCountDifferenceLabel(5)).toBe('Kasa fazlası');
        expect(cashCountDifferenceLabel(-5)).toBe('Kasa açığı');
    });

    it('gün çıkarma ay ve yıl sınırını geçer', () => {
        expect(ymdDaysBefore('2026-03-01', 1)).toBe('2026-02-28');
        expect(ymdDaysBefore('2026-01-10', 29)).toBe('2025-12-12');
    });
});
