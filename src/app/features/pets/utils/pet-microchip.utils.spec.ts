import { PET_MICROCHIP_FORMAT_WARNING, petMicrochipFormatWarning } from '@/app/features/pets/utils/pet-microchip.utils';

describe('petMicrochipFormatWarning', () => {
    it('boş ve 15 rakamda uyarı vermez', () => {
        expect(petMicrochipFormatWarning('')).toBeNull();
        expect(petMicrochipFormatWarning(null)).toBeNull();
        expect(petMicrochipFormatWarning(' 900123456789012 ')).toBeNull();
    });

    it('15 rakam dışında uyarır (engellemez)', () => {
        expect(petMicrochipFormatWarning('12345')).toBe(PET_MICROCHIP_FORMAT_WARNING);
        expect(petMicrochipFormatWarning('9001234567890123')).toBe(PET_MICROCHIP_FORMAT_WARNING);
        expect(petMicrochipFormatWarning('90012345678901A')).toBe(PET_MICROCHIP_FORMAT_WARNING);
    });
});
