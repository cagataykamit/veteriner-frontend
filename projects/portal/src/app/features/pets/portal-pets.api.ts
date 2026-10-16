import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PortalApiClient } from '@portal/app/core/api/portal-api.client';
import { PORTAL_ENDPOINTS } from '@portal/app/core/api/portal-endpoints';

export type PortalPetStatus = 'Active' | 'Deceased';
export type PortalPetGender = 'Male' | 'Female';

/** `GET /links/{linkId}/pets` öğesi (sözleşme §6.2). Takvim tarihi `yyyy-MM-dd`. */
export interface PortalPet {
    readonly petId: string;
    readonly name: string;
    readonly speciesName: string | null;
    readonly breedName: string | null;
    readonly gender: PortalPetGender | null;
    readonly birthDate: string | null;
    readonly microchipNumber: string | null;
    readonly weightKg: number | null;
    readonly status: PortalPetStatus;
}

/** `GET /links/{linkId}/pets/{petId}`: liste öğesi + kısırlaştırma ve renk. */
export interface PortalPetDetail extends PortalPet {
    readonly isNeutered: boolean;
    readonly colorName: string | null;
}

export type PortalVaccinationHistoryStatus = 'Applied' | 'Cancelled';

export interface PortalVaccinationHistoryItem {
    readonly vaccinationId: string;
    readonly vaccineName: string;
    readonly status: PortalVaccinationHistoryStatus;
    readonly appliedAtUtc: string | null;
    readonly dueAtUtc: string | null;
}

/** Planlı aşı; `isOverdue` sunucuda ADR-028 gün kuralıyla hesaplanır, istemci yeniden hesaplamaz. */
export interface PortalUpcomingVaccination {
    readonly vaccinationId: string;
    readonly vaccineName: string;
    readonly dueAtUtc: string | null;
    readonly isOverdue: boolean;
}

/** `GET /links/{linkId}/pets/{petId}/vaccinations` (§6.3). Vefat eden hayvanda `upcoming` boştur. */
export interface PortalPetVaccinations {
    readonly history: readonly PortalVaccinationHistoryItem[];
    readonly upcoming: readonly PortalUpcomingVaccination[];
}

export function isDeceased(pet: Pick<PortalPet, 'status'>): boolean {
    return pet.status === 'Deceased';
}

@Injectable({ providedIn: 'root' })
export class PortalPetsApi {
    private readonly api = inject(PortalApiClient);

    pets(linkId: string): Observable<PortalPet[]> {
        return this.api.get<PortalPet[]>(PORTAL_ENDPOINTS.pets(linkId));
    }

    pet(linkId: string, petId: string): Observable<PortalPetDetail> {
        return this.api.get<PortalPetDetail>(PORTAL_ENDPOINTS.pet(linkId, petId));
    }

    vaccinations(linkId: string, petId: string): Observable<PortalPetVaccinations> {
        return this.api.get<PortalPetVaccinations>(PORTAL_ENDPOINTS.petVaccinations(linkId, petId));
    }
}
