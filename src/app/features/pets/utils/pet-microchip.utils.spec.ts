import { PET_MICROCHIP_FORMAT_WARNING, petMicrochipFormatWarning, sanitizePetMicrochipInput } from '@/app/features/pets/utils/pet-microchip.utils';

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

describe('sanitizePetMicrochipInput', () => {
    it('yalnız rakamları bırakır (harf, virgül, boşluk ayıklanır)', () => {
        expect(sanitizePetMicrochipInput('9001234567890124,2Kedi')).toBe('90012345678901242');
        expect(sanitizePetMicrochipInput(' 900 123 ')).toBe('900123');
        expect(sanitizePetMicrochipInput(null)).toBe('');
    });
});
