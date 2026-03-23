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
        return this.api.post<unknown>(ApiEndpoints.examinations.list(), body).pipe(
            map((raw) => {
                const id = extractCreatedExaminationIdFromPostResponse(raw);
                if (!id) {
                    throw new Error('EXAMINATION_CREATE_NO_ID_IN_RESPONSE');
                }
                return { id };
            }),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    return throwError(() => new Error(messageFromHttpError(err, 'Muayene oluşturulamadı.')));
                }
                if (err instanceof Error && err.message === 'EXAMINATION_CREATE_NO_ID_IN_RESPONSE') {
                    return throwError(
                        () =>
                            new Error(
                                'Sunucu yanıtında muayene kimliği okunamadı. Kayıt oluşmuş olabilir; muayene listesini kontrol edin.'
                            )
                    );
                }
                return throwError(() =>
                    err instanceof Error ? err : new Error('Muayene oluşturulamadı.')
                );
            })
        );
    }
}

function extractCreatedExaminationIdFromPostResponse(body: unknown): string | null {
    if (body == null) {
        return null;
    }
    if (typeof body === 'string') {
        return body.trim() || null;
    }
    if (typeof body !== 'object') {
        return null;
    }
    const o = body as Record<string, unknown>;
    const idKeys = ['id', 'Id', 'examinationId', 'ExaminationId'];
    for (const k of idKeys) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
        if (typeof v === 'number' && !Number.isNaN(v)) {
            return String(v);
        }
    }
    const wrappers = ['data', 'Data', 'value', 'Value', 'result', 'Result', 'examination', 'Examination'];
    for (const w of wrappers) {
        const inner = o[w];
        if (inner && typeof inner === 'object') {
            const n = inner as Record<string, unknown>;
            for (const k of idKeys) {
                const v = n[k];
                if (typeof v === 'string' && v.trim()) {
                    return v.trim();
                }
                if (typeof v === 'number' && !Number.isNaN(v)) {
                    return String(v);
                }
            }
        }
    }
    return null;
}
