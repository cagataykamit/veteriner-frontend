import { convertToParamMap } from '@angular/router';
import { readAppointmentsListLinkFilters, singleDayAppointmentsLinkQuery, upcomingScheduledAppointmentsLinkQuery } from './appointments-list-link.utils';

describe('appointments-list-link.utils', () => {
    it('planlı yaklaşan randevular: durum Planlandı ve İstanbul gününe göre bugünden itibaren', () => {
        // 21:30Z İstanbul'da ertesi gün 00:30'dur.
        expect(upcomingScheduledAppointmentsLinkQuery(new Date('2026-10-15T21:30:00Z'))).toEqual({ status: '0', fromDate: '2026-10-16' });
    });

    it('tek gün bağlantısı iki ucu aynı güne kurar', () => {
        expect(singleDayAppointmentsLinkQuery('2026-10-16')).toEqual({ fromDate: '2026-10-16', toDate: '2026-10-16' });
    });

    it('okuma: geçerli değerler alınır, geçersizler boş kalır, hiçbiri yoksa null', () => {
        expect(readAppointmentsListLinkFilters(convertToParamMap({ status: '3', fromDate: '2026-10-01', toDate: 'bozuk' }))).toEqual({
            status: '3',
            fromDate: '2026-10-01',
            toDate: ''
        });
        expect(readAppointmentsListLinkFilters(convertToParamMap({ status: '9', petId: 'p1' }))).toBeNull();
        expect(readAppointmentsListLinkFilters(convertToParamMap({}))).toBeNull();
    });
});
