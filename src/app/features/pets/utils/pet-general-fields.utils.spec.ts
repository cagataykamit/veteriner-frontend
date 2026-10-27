import type { PetDetailVm } from '@/app/entities/pet/models/pet-vm.model';
import { buildPetGeneralFields } from './pet-general-fields.utils';

const pet = (over: Partial<PetDetailVm>): PetDetailVm =>
    ({
        speciesName: 'Köpek',
        breed: '—',
        gender: '',
        colorName: '—',
        weight: '12',
        microchipNumber: '',
        passportOrTagNumber: '—',
        specialProtocolNumber: '—',
        hbsAnimalId: '',
        isNeutered: 'Evet',
        ...over
    }) as PetDetailVm;

describe('buildPetGeneralFields', () => {
    it('dolu alanları ve boş alanları (— veya boş metin) ayırır', () => {
        const { filled, empty } = buildPetGeneralFields(pet({}));

        expect(filled.map((f) => f.label)).toEqual(['Tür', 'Ağırlık', 'Kısırlaştırılmış mı?']);
        expect(empty.map((f) => f.label)).toEqual(['Cins', 'Cinsiyet', 'Renk', 'Çip numarası', 'Karne / Küpe no', 'Özel protokol no', 'HBS kimlik no']);
    });

    it('hepsi doluysa boş liste yoktur', () => {
        const { empty } = buildPetGeneralFields(
            pet({ breed: 'Golden', gender: 'Male', colorName: 'Sarı', microchipNumber: '1', passportOrTagNumber: '2', specialProtocolNumber: '3', hbsAnimalId: 'TR-1' })
        );

        expect(empty.length).toBe(0);
    });
});
