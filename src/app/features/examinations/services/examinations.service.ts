import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    mapCreateExaminationToApiBody,
    mapExaminationWriteResultDtoToVm,
    mapUpdateExaminationToApiBody,
    mapExaminationDetailDtoToVm,
    mapExaminationDetailDtoToEditVm,
    mapExaminationRelatedSummaryDtoToVm,
    mapPagedExaminationsToVm,
    examinationsQueryToHttpParams
} from '@/app/features/examinations/data/examination.mapper';
import type {
    ExaminationDetailDto,
    ExaminationListItemDtoPagedResult,
    ExaminationRelatedSummaryDto
} from '@/app/features/examinations/models/examination-api.model';
import type {
    CreateExaminationRequest,
    UpdateExaminationRequest
} from '@/app/features/examinations/models/examination-create.model';
import type { ExaminationsListQuery } from '@/app/features/examinations/models/examination-query.model';
import type {
    ExaminationDetailVm,
    ExaminationEditVm,
    ExaminationListItemVm,
    ExaminationRelatedSummaryVm,
    ExaminationWriteResultVm
} from '@/app/features/examinations/models/examination-vm.model';
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
    private readonly auth = inject(AuthService);

    getExaminations(query: ExaminationsListQuery): Observable<ExaminationsPagedVm> {
        const clinicFromAuth = this.auth.getClinicId()?.trim() ?? '';
        const merged: ExaminationsListQuery = {
            ...query,
            clinicId: query.clinicId?.trim() ? query.clinicId.trim() : clinicFromAuth || undefined
        };
        const params = examinationsQueryToHttpParams(merged);
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

    /** Tek çağrı: muayeneye bağlı tedavi, reçete, lab, yatış, ödeme özeti. */
    getExaminationRelatedSummary(examinationId: string): Observable<ExaminationRelatedSummaryVm> {
        return this.api.get<ExaminationRelatedSummaryDto>(ApiEndpoints.examinations.relatedSummary(examinationId)).pipe(
            map((dto) => mapExaminationRelatedSummaryDtoToVm(dto)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'İlgili kayıtlar yüklenemedi.')))
            )
        );
    }

    getExaminationForEditById(id: string): Observable<ExaminationEditVm> {
        return this.api.get<ExaminationDetailDto>(ApiEndpoints.examinations.byId(id)).pipe(
            map((dto) => {
                const vm = mapExaminationDetailDtoToEditVm(dto);
                if (!vm.rowVersion) {
                    // Sürümsüz PUT backend'de 400 verir; sürüm yoksa düzenlemeye izin verme.
                    throw new Error('Sunucu kayıt sürümünü (rowVersion) döndürmedi; düzenleme yapılamaz.');
                }
                return vm;
            }),
            catchError((err: unknown) =>
                throwError(() =>
                    err instanceof HttpErrorResponse
                        ? new Error(messageFromHttpError(err, 'Muayene düzenleme bilgileri yüklenemedi.'))
                        : err instanceof Error
                          ? err
                          : new Error('Muayene düzenleme bilgileri yüklenemedi.')
                )
            )
        );
    }

    createExamination(payload: CreateExaminationRequest): Observable<ExaminationWriteResultVm> {
        const body = mapCreateExaminationToApiBody(payload);
        return this.api.post<unknown>(ApiEndpoints.examinations.list(), body).pipe(
            map((raw) => {
                const result = mapExaminationWriteResultDtoToVm(raw);
                if (!result) {
                    throw new Error('EXAMINATION_CREATE_NO_ID_IN_RESPONSE');
                }
                return result;
            }),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    // Create formunda alan bazlı parse için ham HttpErrorResponse korunur.
                    return throwError(() => err);
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

    /** PUT; `rowVersion` zorunlu. Hata, çakışma kodunu (`code`) ayrıştırabilmek için ham `HttpErrorResponse` olarak iletilir. */
    updateExamination(id: string, payload: UpdateExaminationRequest): Observable<ExaminationWriteResultVm> {
        const body = mapUpdateExaminationToApiBody(payload);
        return this.api.put<unknown>(ApiEndpoints.examinations.byId(id), body).pipe(
            map((raw) => mapExaminationWriteResultDtoToVm(raw) ?? { id, rowVersion: null }),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    return throwError(() => err);
                }
                return throwError(() =>
                    err instanceof Error ? err : new Error('Muayene güncellenemedi.')
                );
            })
        );
    }
}
