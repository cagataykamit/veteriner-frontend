import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import {
    extractCreatedPetIdFromPostResponse,
    mapCreatePetToApiBody,
    mapPetDetailDtoToVm,
    mapPetDetailDtoToEditVm,
    mapPagedPetsToVm,
    mapPetHistorySummaryDtoToVm,
    petsQueryToHttpParams
} from '@/app/features/pets/data/pet.mapper';
import type { PetDetailDto, PetHistorySummaryDto, PetListItemDtoPagedResult } from '@/app/features/pets/models/pet-api.model';
import type { CreatePetRequest } from '@/app/features/pets/models/pet-create.model';
import type { PetsListQuery } from '@/app/features/pets/models/pet-query.model';
import type { PetDetailVm, PetEditVm, PetHistorySummaryVm, PetListItemVm } from '@/app/features/pets/models/pet-vm.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

export interface PetsPagedVm {
    items: PetListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class PetsService {
    private readonly api = inject(ApiClient);

    getPets(query: PetsListQuery): Observable<PetsPagedVm> {
        const params = petsQueryToHttpParams(query);
        return this.api.get<PetListItemDtoPagedResult>(ApiEndpoints.pets.list(), params).pipe(
            map((res) => mapPagedPetsToVm(res)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Hayvan listesi yüklenemedi.')))
            )
        );
    }

    getPetById(id: string): Observable<PetDetailVm> {
        return this.api.get<PetDetailDto>(ApiEndpoints.pets.byId(id)).pipe(
            map((dto) => mapPetDetailDtoToVm(dto)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Hayvan bulunamadı veya yüklenemedi.')))
            )
        );
    }

    /** Tek çağrı: pet detay hasta geçmişi (randevu, muayene, tedavi, …). */
    getPetHistorySummary(petId: string): Observable<PetHistorySummaryVm> {
        return this.api.get<PetHistorySummaryDto>(ApiEndpoints.pets.historySummary(petId)).pipe(
            map((dto) => mapPetHistorySummaryDtoToVm(dto)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Hasta geçmişi yüklenemedi.')))
            )
        );
    }

    getPetForEditById(id: string): Observable<PetEditVm> {
        return this.api.get<PetDetailDto>(ApiEndpoints.pets.byId(id)).pipe(
            map((dto) => mapPetDetailDtoToEditVm(dto)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Hayvan düzenleme bilgileri yüklenemedi.')))
            )
        );
    }

    /**
     * POST liste endpoint’i.
     * Yanıt: düz DTO, sarmalayıcı veya `petId` — `extractCreatedPetIdFromPostResponse`.
     * HTTP hataları (400 alan doğrulama vb.) bileşende `parsePetCreateHttpError` için olduğu gibi iletilir.
     */
    createPet(payload: CreatePetRequest): Observable<{ id: string }> {
        const body = mapCreatePetToApiBody(payload);
        return this.api.post<unknown>(ApiEndpoints.pets.list(), body).pipe(
            map((raw) => {
                const id = extractCreatedPetIdFromPostResponse(raw);
                if (!id) {
                    throw new Error('PET_CREATE_NO_ID_IN_RESPONSE');
                }
                return { id };
            }),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    return throwError(() => err);
                }
                if (err instanceof Error && err.message === 'PET_CREATE_NO_ID_IN_RESPONSE') {
                    return throwError(
                        () =>
                            new Error(
                                'Sunucu yanıtında hayvan kimliği okunamadı. Kayıt oluşmuş olabilir; hayvan listesini kontrol edin.'
                            )
                    );
                }
                return throwError(() =>
                    err instanceof Error ? err : new Error('Hayvan oluşturulamadı.')
                );
            })
        );
    }

    updatePet(id: string, payload: CreatePetRequest): Observable<void> {
        const body = mapCreatePetToApiBody(payload);
        return this.api.put<unknown>(ApiEndpoints.pets.byId(id), body).pipe(
            map(() => void 0),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    return throwError(() => err);
                }
                return throwError(() =>
                    err instanceof Error ? err : new Error('Hayvan güncellenemedi.')
                );
            })
        );
    }
}
