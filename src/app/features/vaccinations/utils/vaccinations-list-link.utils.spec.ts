import { convertToParamMap } from '@angular/router';
import {
    readVaccinationsListLinkFilters,
    upcomingVaccinationsFilters,
    upcomingVaccinationsNext7DaysFilters,
    vaccinationsListLinkQuery
} from './vaccinations-list-link.utils';

describe('vaccinations-list-link.utils', () => {
    it('yaklaşan aşılar: planlı, İstanbul gününe göre bugünden itibaren, yalnız bakım alan hastalar', () => {
        // 21:30Z İstanbul'da ertesi gün 00:30'dur.
        const filters = upcomingVaccinationsFilters(new Date('2026-10-15T21:30:00Z'));

        expect(filters).toEqual({ status: '0', fromDate: '2026-10-16', toDate: '', onlyReceivingCare: true });
        expect(vaccinationsListLinkQuery(filters)).toEqual({ status: '0', fromDate: '2026-10-16', onlyReceivingCare: 'true' });
    });

    it('7 günlük uyarı aralığı bugün dahil 7 İstanbul günüdür: bugün … bugün+6 (ADR-028)', () => {
        // 21:30Z İstanbul'da 2026-10-16 00:30; bitiş 2026-10-22 (iki uç dahil, 7 gün).
        expect(vaccinationsListLinkQuery(upcomingVaccinationsNext7DaysFilters(new Date('2026-10-15T21:30:00Z')))).toEqual({
            status: '0',
            fromDate: '2026-10-16',
            toDate: '2026-10-22',
            onlyReceivingCare: 'true'
        });
    });

    it('7 günlük aralık İstanbul gece yarısından hemen önce hâlâ o günden başlar ve ay sınırını aşar', () => {
        // 20:59Z İstanbul'da 2026-10-28 23:59.
        const filters = upcomingVaccinationsNext7DaysFilters(new Date('2026-10-28T20:59:00Z'));

        expect(filters.fromDate).toBe('2026-10-28');
        expect(filters.toDate).toBe('2026-11-03');
    });

    it('okuma: geçerli değerler alınır, geçersizler boş kalır, hiçbiri yoksa null', () => {
        expect(
            readVaccinationsListLinkFilters(convertToParamMap({ status: '0', fromDate: '2026-10-01', toDate: 'bozuk', onlyReceivingCare: 'TRUE' }))
        ).toEqual({ status: '0', fromDate: '2026-10-01', toDate: '', onlyReceivingCare: true });
        expect(readVaccinationsListLinkFilters(convertToParamMap({ onlyReceivingCare: 'true' }))).toEqual({
            status: '',
            fromDate: '',
            toDate: '',
            onlyReceivingCare: true
        });
        expect(readVaccinationsListLinkFilters(convertToParamMap({ status: '9', onlyReceivingCare: 'evet', overdue: 'true' }))).toBeNull();
        expect(readVaccinationsListLinkFilters(convertToParamMap({}))).toBeNull();
    });

    it('oluşturulan bağlantı okunduğunda aynı süzgeç elde edilir', () => {
        const filters = upcomingVaccinationsNext7DaysFilters(new Date('2026-10-16T09:00:00Z'));

        expect(readVaccinationsListLinkFilters(convertToParamMap(vaccinationsListLinkQuery(filters)))).toEqual(filters);
    });
});
