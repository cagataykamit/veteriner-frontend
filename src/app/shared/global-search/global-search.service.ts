import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLIENTS_READ_CLAIM, PETS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ClientSearchService } from '@/app/features/clients/services/client-search.service';
import type { ClientSearchResultVm } from '@/app/features/clients/services/client-search.service';
import type { PetDetailVm, PetListItemVm } from '@/app/features/pets/models/pet-vm.model';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';

const MAX_PET_RESULTS = 5;
const NO_VALUE = '—';

/** Hayvan sonucu satırı: sahip adı, telefon ve mikroçip hayvan detayından gelir. */
export interface GlobalSearchPetVm {
    id: string;
    name: string;
    /** Sahip kimliği (eylem bağlamı için); bilinmiyorsa `null`. */
    clientId: string | null;
    /** Tür ve ırk; boş olabilir. */
    summary: string;
    ownerName: string;
    ownerPhone: string;
    microchip: string;
    /** Vefat eden hayvan (sonuçta rozetle ayrışır, yeni bakım eylemi sunulmaz). */
    deceased: boolean;
}

export interface GlobalSearchResultVm {
    clients: ClientSearchResultVm[];
    pets: GlobalSearchPetVm[];
    /** Aramayı tamamlayamayan sonuç türleri; kalanlar yine gösterilir. */
    failedKinds: ('clients' | 'pets')[];
}

/**
 * Üst çubuk global araması. Mevcut SEARCH-001 uçlarını kullanır (yeni uç yok): müşteriler {@link ClientSearchService}
 * ile (ad/telefon/e-posta, hayvan adı/mikroçip ile bulunan sahipler dahil), hayvanlar `GET /pets?search=` ile.
 * Yalnız kullanıcının okuma izni olan sonuç türleri sorgulanır.
 */
@Injectable({ providedIn: 'root' })
export class GlobalSearchService {
    private readonly auth = inject(AuthService);
    private readonly clientSearch = inject(ClientSearchService);
    private readonly pets = inject(PetsService);

    /** Hiçbir sonuç türü için okuma izni yoksa arama sunulmaz. */
    canSearch(): boolean {
        return this.canSearchClients() || this.canSearchPets();
    }

    search(term: string): Observable<GlobalSearchResultVm> {
        const failedKinds: GlobalSearchResultVm['failedKinds'] = [];
        const clients$ = this.canSearchClients()
            ? this.clientSearch.search(term).pipe(
                  catchError(() => {
                      failedKinds.push('clients');
                      return of([] as ClientSearchResultVm[]);
                  })
              )
            : of([] as ClientSearchResultVm[]);
        const pets$ = this.canSearchPets()
            ? this.searchPets(term).pipe(
                  catchError(() => {
                      failedKinds.push('pets');
                      return of([] as GlobalSearchPetVm[]);
                  })
              )
            : of([] as GlobalSearchPetVm[]);
        return forkJoin({ clients: clients$, pets: pets$ }).pipe(map((r) => ({ ...r, failedKinds })));
    }

    private canSearchClients(): boolean {
        return this.auth.hasOperationClaim(CLIENTS_READ_CLAIM);
    }

    private canSearchPets(): boolean {
        return this.auth.hasOperationClaim(PETS_READ_CLAIM);
    }

    private searchPets(term: string): Observable<GlobalSearchPetVm[]> {
        return this.pets.getPets({ page: 1, pageSize: MAX_PET_RESULTS, search: term.trim() }).pipe(
            switchMap(({ items }) =>
                items.length
                    ? // Liste uçları sahip ve mikroçip döndürmez; detay bunları tamamlar, detay alınamazsa yalnız ad gösterilir.
                      forkJoin(
                          items.map((item) =>
                              this.pets.getPetById(item.id).pipe(
                                  map((detail): GlobalSearchPetVm => toPetResult(detail)),
                                  catchError(() => of(toPetResultFromListItem(item)))
                              )
                          )
                      )
                    : of([])
            )
        );
    }
}

function present(value: string): string {
    const t = value.trim();
    return t === NO_VALUE ? '' : t;
}

function toPetResult(d: PetDetailVm): GlobalSearchPetVm {
    return {
        id: d.id,
        name: d.name,
        clientId: d.ownerId?.trim() || null,
        summary: [d.speciesName, d.breed].map(present).filter(Boolean).join(' · '),
        ownerName: present(d.clientName),
        ownerPhone: present(d.clientPhone) ? formatClientPhoneForDisplay(d.clientPhone) : '',
        microchip: present(d.microchipNumber),
        deceased: d.status === 'Deceased'
    };
}

function toPetResultFromListItem(i: PetListItemVm): GlobalSearchPetVm {
    return {
        id: i.id,
        name: i.name,
        clientId: i.clientId?.trim() || null,
        summary: [i.speciesName, i.breed].map(present).filter(Boolean).join(' · '),
        ownerName: '',
        ownerPhone: '',
        microchip: '',
        deceased: i.status === 'Deceased'
    };
}
