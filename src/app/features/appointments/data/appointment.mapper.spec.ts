import { appointmentsQueryToHttpParams } from '@/app/features/appointments/data/appointment.mapper';

describe('appointment mapper — liste tarih parametreleri', () => {
    it('İstanbul gününü iki ucu dahil [dateFromUtc, dateToUtc] olarak gönderir', () => {
        const p = appointmentsQueryToHttpParams({ fromDate: '2026-10-08', toDate: '2026-10-08' });
        expect(p.get('dateFromUtc')).toBe('2026-10-07T21:00:00.000Z');
        expect(p.get('dateToUtc')).toBe('2026-10-08T20:59:59.999Z');
    });

    it('gece yarısına yakın randevu doğru İstanbul gününe düşer; ertesi gün 00:00 dışarıda kalır', () => {
        const p = appointmentsQueryToHttpParams({ fromDate: '2026-10-08', toDate: '2026-10-08' });
        const from = Date.parse(p.get('dateFromUtc')!);
        const to = Date.parse(p.get('dateToUtc')!);
        // 2026-10-08 00:00 ve 23:59 İstanbul içeride; 2026-10-09 00:00 İstanbul (21:00Z) dışarıda.
        expect(Date.parse('2026-10-07T21:00:00Z')).toBeGreaterThanOrEqual(from);
        expect(Date.parse('2026-10-08T20:59:00Z')).toBeLessThanOrEqual(to);
        expect(Date.parse('2026-10-08T21:00:00Z')).toBeGreaterThan(to);
    });

    it('çoklu gün aralığında bitiş, bitiş gününün sonudur', () => {
        const p = appointmentsQueryToHttpParams({ fromDate: '2026-10-01', toDate: '2026-10-31' });
        expect(p.get('dateFromUtc')).toBe('2026-09-30T21:00:00.000Z');
        expect(p.get('dateToUtc')).toBe('2026-10-31T20:59:59.999Z');
    });

    it('FromDate/ToDate hiç gönderilmez; tarih yoksa tarih parametresi yok', () => {
        const withDates = appointmentsQueryToHttpParams({ fromDate: '2026-10-08', toDate: '2026-10-09' });
        for (const k of ['FromDate', 'ToDate', 'fromDate', 'toDate']) {
            expect(withDates.has(k)).toBeFalse();
        }
        const none = appointmentsQueryToHttpParams({});
        expect(none.has('dateFromUtc')).toBeFalse();
        expect(none.has('dateToUtc')).toBeFalse();
    });

    it('yalnızca bitiş verilirse yalnızca dateToUtc gider; geçersiz tarih atlanır', () => {
        const onlyTo = appointmentsQueryToHttpParams({ toDate: '2026-10-08' });
        expect(onlyTo.has('dateFromUtc')).toBeFalse();
        expect(onlyTo.get('dateToUtc')).toBe('2026-10-08T20:59:59.999Z');
        const invalid = appointmentsQueryToHttpParams({ fromDate: 'abc', toDate: '  ' });
        expect(invalid.has('dateFromUtc')).toBeFalse();
        expect(invalid.has('dateToUtc')).toBeFalse();
    });
});
