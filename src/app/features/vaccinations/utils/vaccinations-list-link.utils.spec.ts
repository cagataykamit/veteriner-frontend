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

    it('7 günlük uyarı aralığı şimdi+7 günün İstanbul gününde biter', () => {
        expect(vaccinationsListLinkQuery(upcomingVaccinationsNext7DaysFilters(new Date('2026-10-15T21:30:00Z')))).toEqual({
            status: '0',
            fromDate: '2026-10-16',
            toDate: '2026-10-23',
            onlyReceivingCare: 'true'
        });
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
