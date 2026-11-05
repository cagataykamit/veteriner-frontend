import { clinicProfileToWriteDto, mapClinicDetailDtoToVm } from './clinic.mapper';

describe('clinic.mapper — ilçe', () => {
    it('ayrıntıda ilçe okunur; yoksa boş metin', () => {
        expect(mapClinicDetailDtoToVm({ id: 'c1', name: 'A', city: 'İstanbul', District: ' Kadıköy ' })?.district).toBe('Kadıköy');
        expect(mapClinicDetailDtoToVm({ id: 'c1', name: 'A', city: 'İstanbul', district: null })?.district).toBe('');
    });

    it('yazma gövdesinde ilçe kırpılır; boşsa null', () => {
        const form = { name: 'A', city: 'İstanbul', district: '  Üsküdar ', phone: '', email: '', address: '', description: '' };

        expect(clinicProfileToWriteDto(form).district).toBe('Üsküdar');
        expect(clinicProfileToWriteDto({ ...form, district: '   ' }).district).toBeNull();
    });
});
