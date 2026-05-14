import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import {
    mapPagedVaccineDefinitionsToVm,
    vaccineDefinitionsQueryToHttpParams,
    type VaccineDefinitionsListParams
} from '@/app/features/vaccine-definitions/data/vaccine-definition.mapper';
import type { VaccineDefinitionDtoPagedResult } from '@/app/features/vaccine-definitions/models/vaccine-definition-api.model';
import type { VaccineDefinitionListItemVm } from '@/app/features/vaccine-definitions/models/vaccine-definition-vm.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

export interface VaccineDefinitionsPagedVm {
    items: VaccineDefinitionListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class VaccineDefinitionsService {
    private readonly api = inject(ApiClient);

    getVaccineDefinitions(params?: VaccineDefinitionsListParams): Observable<VaccineDefinitionsPagedVm> {
        const merged: VaccineDefinitionsListParams = {
            includeInactive: false,
            page: 1,
            pageSize: 200,
            ...params
        };
        const httpParams = vaccineDefinitionsQueryToHttpParams(merged);
        return this.api.get<VaccineDefinitionDtoPagedResult>(ApiEndpoints.vaccineDefinitions.list(), httpParams).pipe(
            map((res) => mapPagedVaccineDefinitionsToVm(res)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Aşı listesi yüklenemedi. Yetkinizi kontrol edin.')))
            )
        );
    }
}
