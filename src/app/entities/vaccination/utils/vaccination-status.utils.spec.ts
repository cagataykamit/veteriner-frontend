import { parseVaccinationStatusRawToEnum, VACCINATION_WRITE_STATUS_OPTIONS, vaccinationEditStatusOptions } from '@/app/entities/vaccination/utils/vaccination-status.utils';

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

describe('vaccinationEditStatusOptions (ADR-043 AK-3)', () => {
    it('iptal seçenek değildir; planlıda Planlandı ve Uygulandı, uygulanmışta yalnız Uygulandı', () => {
        expect(VACCINATION_WRITE_STATUS_OPTIONS.map((o) => o.value)).toEqual([0, 1]);
        expect(vaccinationEditStatusOptions(0).map((o) => o.value)).toEqual([0, 1]);
        expect(vaccinationEditStatusOptions(1).map((o) => o.value)).toEqual([1]);
    });
});
