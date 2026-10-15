import type { PetDetailVm } from '@/app/features/pets/models/pet-vm.model';
import { petGenderLabel } from '@/app/features/pets/utils/pet-status.utils';

const EMPTY = '—';

export interface PetGeneralField {
    readonly label: string;
    readonly value: string;
}

export interface PetGeneralFields {
    readonly filled: PetGeneralField[];
    readonly empty: PetGeneralField[];
}

/** "Genel bilgiler" alanları: dolu olanlar görünür, boşlar (`—`) ayrı listelenir ("Boş alanları göster" ile açılır). */
export function buildPetGeneralFields(pet: PetDetailVm): PetGeneralFields {
    const fields: PetGeneralField[] = [
        { label: 'Tür', value: pet.speciesName },
        { label: 'Cins', value: pet.breed },
        { label: 'Cinsiyet', value: petGenderLabel(pet.gender) },
        { label: 'Renk', value: pet.colorName },
        { label: 'Ağırlık', value: pet.weight },
        { label: 'Çip numarası', value: pet.microchipNumber },
        { label: 'Karne / Küpe no', value: pet.passportOrTagNumber },
        { label: 'Özel protokol no', value: pet.specialProtocolNumber },
        { label: 'Kısırlaştırılmış mı?', value: pet.isNeutered }
    ];
    const isEmpty = (v: string | null | undefined): boolean => !v || !v.trim() || v.trim() === EMPTY;

    return { filled: fields.filter((f) => !isEmpty(f.value)), empty: fields.filter((f) => isEmpty(f.value)) };
}
