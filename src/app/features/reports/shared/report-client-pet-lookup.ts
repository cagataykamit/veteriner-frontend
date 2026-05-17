import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import type { PetListItemVm } from '@/app/features/pets/models/pet-vm.model';
import { clientOptionsFromList, petOptionsFromList, type SelectOption } from '@/app/shared/forms/client-pet-selection.utils';

const PAGE_SIZE = 200;

/** Müşteri `p-select` — PetNew ile aynı liste çağrısı ölçüsü. */
export function loadReportClientSelectOptions$(clientsService: ClientsService, emptyLabel: string): Observable<SelectOption[]> {
    return clientsService.getClients({ page: 1, pageSize: PAGE_SIZE }).pipe(
        map((r) => [{ label: emptyLabel, value: '' }, ...clientOptionsFromList(r.items)])
    );
}

export interface ReportPetLookupBundle {
    options: SelectOption[];
    pets: PetListItemVm[];
}

/** Hayvan `p-select`; `clientId` doluysa liste o müşteriye göre daralır. */
export function loadReportPetLookupBundle$(
    petsService: PetsService,
    emptyLabel: string,
    clientId?: string | null
): Observable<ReportPetLookupBundle> {
    const cid = clientId?.trim();
    return petsService.getPets({ page: 1, pageSize: PAGE_SIZE, ...(cid ? { clientId: cid } : {}) }).pipe(
        map((r) => ({
            options: [{ label: emptyLabel, value: '' }, ...petOptionsFromList(r.items)],
            pets: r.items
        }))
    );
}
