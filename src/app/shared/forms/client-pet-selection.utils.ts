import type { ClientListItemVm } from '@/app/features/clients/models/client-vm.model';
import type { PetListItemVm } from '@/app/features/pets/models/pet-vm.model';
import { formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';

export interface SelectOption {
    label: string;
    value: string;
}

/**
 * Müşteri / tür vb. `p-select` değerleri: `null`, sayı veya string olabilir; güvenli string id için normalize.
 */
export function trimClientIdControlValue(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value).trim();
}

/** Client dropdown: ad + telefon. */
export function clientOptionsFromList(items: ClientListItemVm[]): SelectOption[] {
    return items.map((c) => ({
        label: `${c.fullName} — ${formatClientPhoneForDisplay(c.phone)}`,
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
