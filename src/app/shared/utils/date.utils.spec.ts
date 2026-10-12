import {
    dateOnlyInputToIstanbulEndUtcIso,
    dateOnlyInputToIstanbulStartUtcIso,
    formatDateDisplay,
    formatDateTimeDisplay,
    formatTimeDisplay,
    formatUtcIsoAsLocalDateDisplay,
    formatUtcIsoAsLocalDateTimeDisplay,
    istanbulDateRangeToUtcIso
} from './date.utils';

/** Tek biçimleyici: aynı UTC anı her ekranda İstanbul gününü/saatini gösterir (tarayıcı saat dilimi etkisiz). */
describe('date.utils — İstanbul görüntüleme', () => {
    const edge = '2026-10-10T22:00:00Z';

    it('gece yarısı sınırı: 2026-10-10T22:00:00Z → 11.10.2026 01:00 (liste ve detay aynı)', () => {
        expect(formatDateTimeDisplay(edge)).toBe('11.10.2026 01:00');
        expect(formatDateDisplay(edge)).toBe('11.10.2026');
        expect(formatTimeDisplay(edge)).toBe('01:00');
        expect(formatUtcIsoAsLocalDateTimeDisplay(edge)).toBe('11.10.2026 01:00');
        expect(formatUtcIsoAsLocalDateDisplay(edge)).toBe('11.10.2026');
    });

    it('offset\'siz API metni UTC kabul edilir (yerel saat sanılmaz)', () => {
        expect(formatDateDisplay('2026-10-10T22:00:00')).toBe('11.10.2026');
    });

    it('yalnız tarih (doğum tarihi vb.) günü kaydırmaz', () => {
        expect(formatDateDisplay('2026-10-10')).toBe('10.10.2026');
    });

    it('boş ve geçersiz değer "—"', () => {
        expect(formatDateDisplay(null)).toBe('—');
        expect(formatDateTimeDisplay('')).toBe('—');
        expect(formatTimeDisplay('geçersiz')).toBe('—');
    });

    it('liste filtresi gün sınırları İstanbul gününe göredir', () => {
        expect(dateOnlyInputToIstanbulStartUtcIso('2026-10-11')).toBe('2026-10-10T21:00:00.000Z');
        expect(dateOnlyInputToIstanbulEndUtcIso('2026-10-11')).toBe('2026-10-11T20:59:59.999Z');
    });

    it('gün aralığı yarı açık [başlangıç günü 00:00, bitiş gününü izleyen gün 00:00) UTC anına çevrilir', () => {
        expect(istanbulDateRangeToUtcIso('2026-10-10', '2026-10-11')).toEqual({
            fromUtc: '2026-10-09T21:00:00.000Z',
            toUtc: '2026-10-11T21:00:00.000Z'
        });
    });

    it('boş veya geçersiz uç atlanır', () => {
        expect(istanbulDateRangeToUtcIso(undefined, ' ')).toEqual({});
        expect(istanbulDateRangeToUtcIso('2026-10-10', undefined)).toEqual({ fromUtc: '2026-10-09T21:00:00.000Z' });
    });
});
