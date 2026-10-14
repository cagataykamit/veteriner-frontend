import { inject, Injectable } from '@angular/core';
import { catchError, map, type Observable, of, startWith } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    CHARGES_READ_CLAIM,
    EXAMINATIONS_READ_CLAIM,
    LAB_RESULTS_READ_CLAIM,
    PETS_READ_CLAIM,
    TREATMENTS_READ_CLAIM,
    VACCINATIONS_READ_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import type { ChargeSuggestionsPagedVm, ChargeSuggestionVm } from '@/app/features/charges/models/charge-suggestion-vm.model';
import { ChargeSuggestionsService } from '@/app/features/charges/services/charge-suggestions.service';
import type { ClientBalanceVm } from '@/app/features/clients/models/client-balance-vm.model';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import type { ExaminationDetailVm } from '@/app/features/examinations/models/examination-vm.model';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import type { LabResultListItemVm } from '@/app/features/lab-results/models/lab-result-vm.model';
import { LabResultsService } from '@/app/features/lab-results/services/lab-results.service';
import type { PetListItemVm } from '@/app/features/pets/models/pet-vm.model';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { activeFollowUpTreatments, type PetCardSection } from '@/app/features/pets/utils/pet-card.utils';
import type { TreatmentListItemVm } from '@/app/features/treatments/models/treatment-vm.model';
import { TreatmentsService } from '@/app/features/treatments/services/treatments.service';
import type { VaccinationListItemVm } from '@/app/features/vaccinations/models/vaccination-vm.model';
import { VaccinationsService } from '@/app/features/vaccinations/services/vaccinations.service';

/** Hasta başına açık kayıt sayısı küçüktür; tek sayfa yeterli (aşan kısım listede "Tümü" ile görülür). */
const FETCH_SIZE = 50;

/** Müşteri bazlı ücret önerisi sayfası (sözleşme §3 örneği); aşan kalemler tutara girmez, sayı yine `totalItems`'tır. */
export const CLIENT_PENDING_CHARGES_PAGE_SIZE = 200;

/** `Scheduled` (planlanmış) aşı; liste ucu enum'u sayı olarak alır. */
const SCHEDULED_VACCINATION_STATUS = '0';

/**
 * Hasta ve müşteri kartının ek okumaları (ADR-020): hasta/müşteri bazlı tek "yapılacaklar" ucu yok; mevcut liste uçları hayvana süzülerek okunur.
 * Her akış önce `loading`, sonra `ok`/`error` yayar ve hata fırlatmaz; okuma izni yoksa istek atılmaz, `null` yayılır.
 */
@Injectable({ providedIn: 'root' })
export class PetCardDataService {
    private readonly auth = inject(AuthService);
    private readonly vaccinations = inject(VaccinationsService);
    private readonly labResults = inject(LabResultsService);
    private readonly chargeSuggestions = inject(ChargeSuggestionsService);
    private readonly clients = inject(ClientsService);
    private readonly examinations = inject(ExaminationsService);
    private readonly treatments = inject(TreatmentsService);
    private readonly pets = inject(PetsService);

    scheduledVaccinations(petId: string): Observable<PetCardSection<VaccinationListItemVm[]>> {
        return this.section(VACCINATIONS_READ_CLAIM, () =>
            this.vaccinations
                .getVaccinations({ page: 1, pageSize: FETCH_SIZE, petId, status: SCHEDULED_VACCINATION_STATUS })
                .pipe(map((r) => r.items.filter((v) => v.petId === petId)))
        );
    }

    requestedLabs(petId: string): Observable<PetCardSection<LabResultListItemVm[]>> {
        return this.section(LAB_RESULTS_READ_CLAIM, () =>
            this.labResults.getLabResults({ page: 1, pageSize: FETCH_SIZE, petId, status: 'Requested' }).pipe(map((r) => r.items.filter((l) => l.petId === petId)))
        );
    }

    pendingCharges(petId: string): Observable<PetCardSection<ChargeSuggestionVm[]>> {
        return this.section(CHARGES_READ_CLAIM, () => this.chargeSuggestions.getPending({ page: 1, pageSize: FETCH_SIZE, petId }).pipe(map((r) => r.items)));
    }

    /** Ücret müşteriye bağlıdır (ADR-012); bakiye sahibin toplamıdır. */
    ownerBalance(clientId: string | null): Observable<PetCardSection<ClientBalanceVm>> {
        return clientId ? this.section(CHARGES_READ_CLAIM, () => this.clients.getClientBalance(clientId)) : of(null);
    }

    /** Vital ve değerlendirme özet ucunda yok; son muayenenin detayından okunur. */
    examination(examinationId: string | null): Observable<PetCardSection<ExaminationDetailVm>> {
        return examinationId ? this.section(EXAMINATIONS_READ_CLAIM, () => this.examinations.getExaminationById(examinationId)) : of(null);
    }

    followUpTreatments(petId: string): Observable<PetCardSection<TreatmentListItemVm[]>> {
        return this.section(TREATMENTS_READ_CLAIM, () =>
            this.treatments.getTreatments({ page: 1, pageSize: FETCH_SIZE, petId }).pipe(map((r) => activeFollowUpTreatments(r.items.filter((t) => t.petId === petId))))
        );
    }

    /** Müşterinin hayvanları (müşteri kartı); liste ucu `ClientId` süzgecini yok sayarsa istemcide daraltılır. */
    clientPets(clientId: string): Observable<PetCardSection<PetListItemVm[]>> {
        return this.section(PETS_READ_CLAIM, () =>
            this.pets.getPets({ page: 1, pageSize: FETCH_SIZE, clientId }).pipe(map((r) => r.items.filter((p) => (p.clientId ?? '').trim() === clientId)))
        );
    }

    /**
     * Müşterinin ücret bekleyen kalemleri tek istekte (`clientId` süzgeci): sayı `totalItems`, kalemler en fazla bir sayfa.
     * Tutar ayrı alan olarak gelmez; istemci sayfadan hesaplar (`pendingChargesTotal`).
     */
    clientPendingCharges(clientId: string): Observable<PetCardSection<ChargeSuggestionsPagedVm>> {
        return this.section(CHARGES_READ_CLAIM, () => this.chargeSuggestions.getPending({ page: 1, pageSize: CLIENT_PENDING_CHARGES_PAGE_SIZE, clientId }));
    }

    private section<T>(claim: string, load: () => Observable<T>): Observable<PetCardSection<T>> {
        if (!this.auth.hasOperationClaim(claim)) {
            return of(null);
        }
        return load().pipe(
            map((data): PetCardSection<T> => ({ state: 'ok', data })),
            catchError(() => of<PetCardSection<T>>({ state: 'error' })),
            startWith<PetCardSection<T>>({ state: 'loading' })
        );
    }
}
