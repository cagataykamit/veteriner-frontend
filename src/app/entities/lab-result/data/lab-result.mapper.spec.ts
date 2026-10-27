import { labResultsQueryToHttpParams } from '@/app/entities/lab-result/data/lab-result.mapper';

describe('lab-result mapper — liste tarih parametreleri', () => {
    it('İstanbul gününü iki ucu dahil [dateFromUtc, dateToUtc] olarak gönderir', () => {
        const p = labResultsQueryToHttpParams({ fromDate: '2026-10-08', toDate: '2026-10-08' });

        expect(p.get('dateFromUtc')).toBe('2026-10-07T21:00:00.000Z');
        expect(p.get('dateToUtc')).toBe('2026-10-08T20:59:59.999Z');
    });

    it('gece yarısına yakın laboratuvar istemi doğru İstanbul gününe düşer; ertesi gün 00:00 dışarıda kalır', () => {
        const p = labResultsQueryToHttpParams({ fromDate: '2026-10-08', toDate: '2026-10-08' });
        const from = Date.parse(p.get('dateFromUtc')!);
        const to = Date.parse(p.get('dateToUtc')!);

        expect(Date.parse('2026-10-07T21:00:00Z')).toBeGreaterThanOrEqual(from);
        expect(Date.parse('2026-10-08T20:59:00Z')).toBeLessThanOrEqual(to);
        expect(Date.parse('2026-10-08T21:00:00Z')).toBeGreaterThan(to);
    });

    it('çoklu gün aralığında bitiş, bitiş gününün sonudur', () => {
        const p = labResultsQueryToHttpParams({ fromDate: '2026-10-01', toDate: '2026-10-31' });

        expect(p.get('dateFromUtc')).toBe('2026-09-30T21:00:00.000Z');
        expect(p.get('dateToUtc')).toBe('2026-10-31T20:59:59.999Z');
    });

    it('FromDate/ToDate hiç gönderilmez; tarih yoksa tarih parametresi yok', () => {
        const withDates = labResultsQueryToHttpParams({ fromDate: '2026-10-08', toDate: '2026-10-09' });

        for (const k of ['FromDate', 'ToDate', 'fromDate', 'toDate']) {
            expect(withDates.has(k)).toBe(false);
        }

        const none = labResultsQueryToHttpParams({});

        expect(none.has('dateFromUtc')).toBe(false);
        expect(none.has('dateToUtc')).toBe(false);
    });

    it('yalnızca bitiş verilirse yalnızca dateToUtc gider; geçersiz tarih atlanır', () => {
        const onlyTo = labResultsQueryToHttpParams({ toDate: '2026-10-08' });

        expect(onlyTo.has('dateFromUtc')).toBe(false);
        expect(onlyTo.get('dateToUtc')).toBe('2026-10-08T20:59:59.999Z');
        const invalid = labResultsQueryToHttpParams({ fromDate: 'abc', toDate: '  ' });

        expect(invalid.has('dateFromUtc')).toBe(false);
        expect(invalid.has('dateToUtc')).toBe(false);
    });
});
