import { prescriptionsQueryToHttpParams } from '@/app/features/prescriptions/data/prescription.mapper';

describe('prescription mapper — liste tarih parametreleri', () => {
    it('İstanbul gününü iki ucu dahil [dateFromUtc, dateToUtc] olarak gönderir', () => {
        const p = prescriptionsQueryToHttpParams({ fromDate: '2026-10-08', toDate: '2026-10-08' });
        expect(p.get('dateFromUtc')).toBe('2026-10-07T21:00:00.000Z');
        expect(p.get('dateToUtc')).toBe('2026-10-08T20:59:59.999Z');
    });

    it('gece yarısına yakın reçete doğru İstanbul gününe düşer; ertesi gün 00:00 dışarıda kalır', () => {
        const p = prescriptionsQueryToHttpParams({ fromDate: '2026-10-08', toDate: '2026-10-08' });
        const from = Date.parse(p.get('dateFromUtc')!);
        const to = Date.parse(p.get('dateToUtc')!);
        expect(Date.parse('2026-10-07T21:00:00Z')).toBeGreaterThanOrEqual(from);
        expect(Date.parse('2026-10-08T20:59:00Z')).toBeLessThanOrEqual(to);
        expect(Date.parse('2026-10-08T21:00:00Z')).toBeGreaterThan(to);
    });

    it('çoklu gün aralığında bitiş, bitiş gününün sonudur', () => {
        const p = prescriptionsQueryToHttpParams({ fromDate: '2026-10-01', toDate: '2026-10-31' });
        expect(p.get('dateFromUtc')).toBe('2026-09-30T21:00:00.000Z');
        expect(p.get('dateToUtc')).toBe('2026-10-31T20:59:59.999Z');
    });

    it('FromDate/ToDate hiç gönderilmez; tarih yoksa tarih parametresi yok', () => {
        const withDates = prescriptionsQueryToHttpParams({ fromDate: '2026-10-08', toDate: '2026-10-09' });
        for (const k of ['FromDate', 'ToDate', 'fromDate', 'toDate']) {
            expect(withDates.has(k)).toBeFalse();
        }
        const none = prescriptionsQueryToHttpParams({});
        expect(none.has('dateFromUtc')).toBeFalse();
        expect(none.has('dateToUtc')).toBeFalse();
    });

    it('yalnızca bitiş verilirse yalnızca dateToUtc gider; geçersiz tarih atlanır', () => {
        const onlyTo = prescriptionsQueryToHttpParams({ toDate: '2026-10-08' });
        expect(onlyTo.has('dateFromUtc')).toBeFalse();
        expect(onlyTo.get('dateToUtc')).toBe('2026-10-08T20:59:59.999Z');
        const invalid = prescriptionsQueryToHttpParams({ fromDate: 'abc', toDate: '  ' });
        expect(invalid.has('dateFromUtc')).toBeFalse();
        expect(invalid.has('dateToUtc')).toBeFalse();
    });
});
