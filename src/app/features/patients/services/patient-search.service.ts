import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { PETS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { ClientSearchResultVm } from '@/app/entities/client/services/client-search.service';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import { GlobalSearchService } from '@/app/features/patients/services/global-search.service';

const MAX_PATIENTS = 15;
const PETS_PER_OWNER = 5;

/** Arama sonucunda hayvan ve sahibi birlikte; eylemler ikisinin kimliğini taşır. */
export interface PatientRowVm {
    petId: string;
    petName: string;
    /** Tür ve ırk; boş olabilir. */
    summary: string;
    microchip: string;
    clientId: string | null;
    ownerName: string;
    ownerPhone: string;
    deceased: boolean;
}

/** Kayıtlı hayvanı olmayan (ya da hayvan okuma izni olmayan) sahip. */
export interface OwnerRowVm {
    clientId: string;
    name: string;
    phone: string;
}

export interface PatientSearchResultVm {
    patients: PatientRowVm[];
    owners: OwnerRowVm[];
    /** Aramayı tamamlayamayan sonuç türleri; kalanlar yine gösterilir. */
    failedKinds: ('clients' | 'pets')[];
}

/**
 * Hastalar girişinin araması: üst çubuktaki global aramayı ({@link GlobalSearchService}, aynı toleranslı mantık) kullanır;
 * sahip adıyla bulunan müşterilerin hayvanları eklenerek her sonuç "hayvan + sahip" satırı olur. Yeni uç yok.
 */
@Injectable({ providedIn: 'root' })
export class PatientSearchService {
    private readonly auth = inject(AuthService);
    private readonly globalSearch = inject(GlobalSearchService);
    private readonly pets = inject(PetsService);

    canSearch(): boolean {
        return this.globalSearch.canSearch();
    }

    search(term: string): Observable<PatientSearchResultVm> {
        return this.globalSearch.search(term).pipe(
            switchMap((r) => {
                const hits = r.pets.map(
                    (p): PatientRowVm => ({ petId: p.id, petName: p.name, summary: p.summary, microchip: p.microchip, clientId: p.clientId, ownerName: p.ownerName, ownerPhone: p.ownerPhone, deceased: p.deceased })
                );
                // Hayvan okuma yetkisi yoksa sahipler hayvansız gösterilir.
                const expanded$ = this.auth.hasOperationClaim(PETS_READ_CLAIM) && r.clients.length
                    ? forkJoin(r.clients.map((c) => this.ownerPatients(c)))
                    : of(r.clients.map((client) => ({ client, pets: [] as PatientRowVm[] })));

                return expanded$.pipe(map((expanded) => mergeResults(hits, expanded, r.failedKinds)));
            })
        );
    }

    private ownerPatients(client: ClientSearchResultVm): Observable<{ client: ClientSearchResultVm; pets: PatientRowVm[] }> {
        return this.pets.getPets({ page: 1, pageSize: PETS_PER_OWNER, clientId: client.id }).pipe(
            map((page) => page.items.filter((p) => !p.clientId || p.clientId === client.id)),
            catchError(() => of([])),
            map((items) => ({
                client,
                pets: items.map((p): PatientRowVm => ({
                    petId: p.id,
                    petName: p.name,
                    summary: [p.speciesName, p.breed].map((v) => v.trim()).filter((v) => v && v !== '—').join(' · '),
                    microchip: '',
                    clientId: client.id,
                    ownerName: client.fullName,
                    ownerPhone: client.phone,
                    deceased: p.status === 'Deceased'
                }))
            }))
        );
    }
}

/** Doğrudan bulunan hayvanlara sahiplerinin hayvanları (tekrarsız) eklenir; hayvanı olmayan sahip ayrı listelenir. */
function mergeResults(hits: PatientRowVm[], expanded: { client: ClientSearchResultVm; pets: PatientRowVm[] }[], failedKinds: PatientSearchResultVm['failedKinds']): PatientSearchResultVm {
    const seen = new Set(hits.map((p) => p.petId));
    const patients = [...hits];
    const owners: OwnerRowVm[] = [];

    for (const { client, pets } of expanded) {
        for (const pet of pets) {
            if (!seen.has(pet.petId)) {
                seen.add(pet.petId);
                patients.push(pet);
            }
        }

        if (!pets.length) {
            owners.push({ clientId: client.id, name: client.fullName, phone: client.phone });
        }
    }

    return { patients: patients.slice(0, MAX_PATIENTS), owners, failedKinds };
}
