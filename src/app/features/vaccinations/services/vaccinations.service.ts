import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import {
    mapCreateVaccinationToApiBody,
    mapPagedVaccinationsToVm,
    mapVaccinationDetailDtoToVm,
    vaccinationsQueryToHttpParams
} from '@/app/features/vaccinations/data/vaccination.mapper';
import type { VaccinationDetailDto, VaccinationListItemDtoPagedResult } from '@/app/features/vaccinations/models/vaccination-api.model';
import type { CreateVaccinationRequest } from '@/app/features/vaccinations/models/vaccination-create.model';
import type { VaccinationsListQuery } from '@/app/features/vaccinations/models/vaccination-query.model';
import type { VaccinationDetailVm, VaccinationListItemVm } from '@/app/features/vaccinations/models/vaccination-vm.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

export interface VaccinationsPagedVm {
    items: VaccinationListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class VaccinationsService {
    private readonly api = inject(ApiClient);

    getVaccinations(query: VaccinationsListQuery): Observable<VaccinationsPagedVm> {
        const params = vaccinationsQueryToHttpParams(query);
        return this.api.get<VaccinationListItemDtoPagedResult>(ApiEndpoints.vaccinations.list(), params).pipe(
            map((res) => mapPagedVaccinationsToVm(res)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Aşı listesi yüklenemedi.')))
            )
        );
    }

    getVaccinationById(id: string): Observable<VaccinationDetailVm> {
        return this.api.get<VaccinationDetailDto>(ApiEndpoints.vaccinations.byId(id)).pipe(
            map((dto) => mapVaccinationDetailDtoToVm(dto)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Aşı kaydı bulunamadı veya yüklenemedi.')))
            )
        );
    }

    /**
     * POST liste endpoint’i (muayene/randevu ile aynı varsayım).
     * Yanıt gövdesinde tam `VaccinationDetailDto` ve `id` beklenir; yalnızca `{ id }` dönen sarmalayıcılar için mapper genişletilir.
     */
    createVaccination(payload: CreateVaccinationRequest): Observable<{ id: string }> {
        const body = mapCreateVaccinationToApiBody(payload);
        return this.api.post<VaccinationDetailDto>(ApiEndpoints.vaccinations.list(), body).pipe(
            map((dto) => {
                if (!dto?.id) {
                    throw new Error('Sunucu yanıtında aşı kaydı kimliği yok.');
                }
                return { id: dto.id };
            }),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Aşı kaydı oluşturulamadı.')))
            )
        );
    }
}
