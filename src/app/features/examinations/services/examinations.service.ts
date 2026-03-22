import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import {
    mapCreateExaminationToApiBody,
    mapExaminationDetailDtoToVm,
    mapPagedExaminationsToVm,
    examinationsQueryToHttpParams
} from '@/app/features/examinations/data/examination.mapper';
import type { ExaminationDetailDto, ExaminationListItemDtoPagedResult } from '@/app/features/examinations/models/examination-api.model';
import type { CreateExaminationRequest } from '@/app/features/examinations/models/examination-create.model';
import type { ExaminationsListQuery } from '@/app/features/examinations/models/examination-query.model';
import type { ExaminationDetailVm, ExaminationListItemVm } from '@/app/features/examinations/models/examination-vm.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

export interface ExaminationsPagedVm {
    items: ExaminationListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class ExaminationsService {
    private readonly api = inject(ApiClient);

    getExaminations(query: ExaminationsListQuery): Observable<ExaminationsPagedVm> {
        const params = examinationsQueryToHttpParams(query);
        return this.api.get<ExaminationListItemDtoPagedResult>(ApiEndpoints.examinations.list(), params).pipe(
            map((res) => mapPagedExaminationsToVm(res)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Muayene listesi yüklenemedi.')))
            )
        );
    }

    getExaminationById(id: string): Observable<ExaminationDetailVm> {
        return this.api.get<ExaminationDetailDto>(ApiEndpoints.examinations.byId(id)).pipe(
            map((dto) => mapExaminationDetailDtoToVm(dto)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Muayene bulunamadı veya yüklenemedi.')))
            )
        );
    }

    createExamination(payload: CreateExaminationRequest): Observable<{ id: string }> {
        const body = mapCreateExaminationToApiBody(payload);
        return this.api.post<ExaminationDetailDto>(ApiEndpoints.examinations.list(), body).pipe(
            map((dto) => {
                if (!dto?.id) {
                    throw new Error('Sunucu yanıtında muayene kimliği yok.');
                }
                return { id: dto.id };
            }),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Muayene oluşturulamadı.')))
            )
        );
    }
}
