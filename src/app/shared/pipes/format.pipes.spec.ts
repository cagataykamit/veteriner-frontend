import { MoneyPipe } from './money.pipe';
import { TrDatePipe, TrDateTimePipe, TrTimePipe } from './tr-date.pipe';

describe('format pipes', () => {
    it('money: TRY varsayılanı ve verilen para birimi', () => {
        const pipe = new MoneyPipe();

        expect(pipe.transform(1234.5)).toBe(new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(1234.5));
        expect(pipe.transform(10, 'EUR')).toContain('€');
        expect(pipe.transform(null)).toBe('—');
        expect(pipe.transform(Number.NaN)).toBe('—');
    });

    it('trDate / trDateTime / trTime: UTC anı İstanbul duvar saatiyle gösterilir, boş değer tire', () => {
        const utc = '2026-01-15T21:30:00Z'; // İstanbul: 16.01.2026 00:30

        expect(new TrDatePipe().transform(utc)).toBe('16.01.2026');
        expect(new TrDateTimePipe().transform(utc)).toBe('16.01.2026 00:30');
        expect(new TrTimePipe().transform(utc)).toBe('00:30');
        expect(new TrDatePipe().transform(null)).toBe('—');
        expect(new TrDateTimePipe().transform('')).toBe('—');
    });

    it('offset verilmeyen metin UTC kabul edilir', () => {
        expect(new TrDateTimePipe().transform('2026-04-20T03:03:00')).toBe('20.04.2026 06:03');
    });
});
