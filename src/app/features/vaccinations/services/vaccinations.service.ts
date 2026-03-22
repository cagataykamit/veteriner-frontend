import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { mapPagedVaccinationsToVm, vaccinationsQueryToHttpParams } from '@/app/features/vaccinations/data/vaccination.mapper';
import type { VaccinationListItemDtoPagedResult } from '@/app/features/vaccinations/models/vaccination-api.model';
import type { VaccinationsListQuery } from '@/app/features/vaccinations/models/vaccination-query.model';
import type { VaccinationListItemVm } from '@/app/features/vaccinations/models/vaccination-vm.model';
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
}
