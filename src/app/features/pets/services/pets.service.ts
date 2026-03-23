import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import {
    mapCreatePetToApiBody,
    mapPetDetailDtoToVm,
    mapPagedPetsToVm,
    petsQueryToHttpParams
} from '@/app/features/pets/data/pet.mapper';
import type { PetDetailDto, PetListItemDtoPagedResult } from '@/app/features/pets/models/pet-api.model';
import type { CreatePetRequest } from '@/app/features/pets/models/pet-create.model';
import type { PetsListQuery } from '@/app/features/pets/models/pet-query.model';
import type { PetDetailVm, PetListItemVm } from '@/app/features/pets/models/pet-vm.model';
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

    /**
     * POST liste endpoint’i (clients ve diğer modüllerle aynı varsayım).
     * Yanıt gövdesinde `PetDetailDto` ve `id` beklenir.
     */
    createPet(payload: CreatePetRequest): Observable<{ id: string }> {
        const body = mapCreatePetToApiBody(payload);
        return this.api.post<PetDetailDto>(ApiEndpoints.pets.list(), body).pipe(
            map((dto) => {
                if (!dto?.id) {
                    throw new Error('Sunucu yanıtında hayvan kimliği yok.');
                }
                return { id: dto.id };
            }),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Hayvan oluşturulamadı.')))
            )
        );
    }
}
