import type { ClientListItemVm } from '@/app/features/clients/models/client-vm.model';
import type { PetListItemVm } from '@/app/features/pets/models/pet-vm.model';

export interface SelectOption {
    label: string;
    value: string;
}

/** Client dropdown: ad + telefon. */
export function clientOptionsFromList(items: ClientListItemVm[]): SelectOption[] {
    return items.map((c) => ({
        label: `${c.fullName} — ${c.phone}`,
        value: c.id
    }));
}

/** Pet dropdown: ad + tür. */
export function petOptionsFromList(items: PetListItemVm[]): SelectOption[] {
    return items.map((p) => ({
        label: `${p.name} — ${p.speciesName}`,
        value: p.id
    }));
}

/**
 * ClientId query backend’de yok sayıldığında yedek: DTO’daki clientId ile filtrele.
 */
export function filterPetsByClientId(pets: PetListItemVm[], clientId: string | null): PetListItemVm[] {
    const id = clientId?.trim();
    if (!id) {
        return [];
    }
    return pets.filter((p) => (p.clientId ?? '').trim() === id);
}
