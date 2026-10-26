import { parseVaccinationStatusRawToEnum } from '@/app/features/vaccinations/utils/vaccination-status.utils';

describe('vaccination status — dizgi kodları dilden bağımsız eşlenir', () => {
    it('büyük harfli kodlar, "I" içerenler dahil (Türkçe ı/İ dönüşümüne takılmaz), eşlenir', () => {
        expect(parseVaccinationStatusRawToEnum('PLANNED')).toBe(0);
        expect(parseVaccinationStatusRawToEnum('PLANLANDI')).toBe(0);
        expect(parseVaccinationStatusRawToEnum('APPLIED')).toBe(1);
        expect(parseVaccinationStatusRawToEnum('UYGULANDI')).toBe(1);
        expect(parseVaccinationStatusRawToEnum('CANCELLED')).toBe(2);
        expect(parseVaccinationStatusRawToEnum('IPTAL')).toBe(2);
    });
});
