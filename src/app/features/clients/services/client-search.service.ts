import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import type { ClientListItemVm } from '@/app/features/clients/models/client-vm.model';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { filterPetsByClientId } from '@/app/shared/forms/client-pet-selection.utils';
import { formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';

export const CLIENT_SEARCH_MIN_LENGTH = 2;
const MAX_RESULTS = 10;
const OWNER_PET_HITS = 20;
const PETS_PER_CLIENT = 5;

/** Arama sonucu satırı: aynı isimli müşterileri ayırt etmek için telefon ve hayvan adları da taşır. */
export interface ClientSearchResultVm {
    id: string;
    fullName: string;
    phone: string;
    petNames: string[];
    /** Girdi alanında gösterilen kısa metin. */
    label: string;
}

/**
 * Müşteri araması (SEARCH-001, sunucu tarafı): `GET /clients?search=` ad/telefon/e-posta,
 * `GET /pets?search=` hayvan adı/mikroçip/sahip. İki sonuç sahip bazında birleştirilir.
 */
@Injectable({ providedIn: 'root' })
export class ClientSearchService {
    private readonly clients = inject(ClientsService);
    private readonly pets = inject(PetsService);

    search(term: string): Observable<ClientSearchResultVm[]> {
        const search = term.trim();
        return forkJoin({
            clients: this.clients.getClients({ page: 1, pageSize: MAX_RESULTS, search }).pipe(map((r) => r.items)),
            // Hayvan okuma yetkisi yoksa veya arama başarısızsa müşteri sonuçları yine gösterilir.
            petHits: this.pets.getPets({ page: 1, pageSize: OWNER_PET_HITS, search }).pipe(
                map((r) => r.items),
                catchError(() => of([]))
            )
        }).pipe(
            switchMap(({ clients, petHits }) => {
                const known = new Set(clients.map((c) => c.id));
                const extraOwnerIds = [...new Set(petHits.map((p) => p.clientId).filter((id): id is string => !!id && !known.has(id)))];
                const owners$ = extraOwnerIds.length
                    ? forkJoin(
                          extraOwnerIds.map((id) =>
                              this.clients.getClientById(id).pipe(
                                  map((c): ClientListItemVm => ({ id: c.id, fullName: c.fullName, phone: c.phone, email: c.email, createdAtUtc: c.createdAtUtc })),
                                  catchError(() => of(null))
                              )
                          )
                      )
                    : of([]);
                return owners$.pipe(map((owners) => [...clients, ...owners.filter((o): o is ClientListItemVm => o !== null)].slice(0, MAX_RESULTS)));
            }),
            switchMap((candidates) => (candidates.length ? forkJoin(candidates.map((c) => this.withPetNames(c))) : of([])))
        );
    }

    /** Seçili (ör. adres çubuğundan gelen) müşteri kimliği için etiketi çözer. */
    getById(id: string): Observable<ClientSearchResultVm> {
        return this.clients.getClientById(id).pipe(
            map((c) => toResult({ id: c.id, fullName: c.fullName, phone: c.phone, email: c.email, createdAtUtc: c.createdAtUtc }, []))
        );
    }

    private withPetNames(client: ClientListItemVm): Observable<ClientSearchResultVm> {
        return this.pets.getPets({ page: 1, pageSize: PETS_PER_CLIENT, clientId: client.id }).pipe(
            map((r) => {
                const hasOwner = r.items.some((p) => (p.clientId ?? '').trim());
                return (hasOwner ? filterPetsByClientId(r.items, client.id) : r.items).map((p) => p.name);
            }),
            catchError(() => of([] as string[])),
            map((petNames) => toResult(client, petNames))
        );
    }
}

function toResult(c: ClientListItemVm, petNames: string[]): ClientSearchResultVm {
    return {
        id: c.id,
        fullName: c.fullName,
        phone: formatClientPhoneForDisplay(c.phone),
        petNames,
        label: `${c.fullName} — ${formatClientPhoneForDisplay(c.phone)}`
    };
}
