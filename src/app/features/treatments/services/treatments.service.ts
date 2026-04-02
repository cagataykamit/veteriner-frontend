import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    mapCreateTreatmentToApiBody,
    mapPagedTreatmentsToVm,
    mapTreatmentDetailDtoToEditVm,
    mapTreatmentDetailDtoToVm,
    treatmentsQueryToHttpParams
} from '@/app/features/treatments/data/treatment.mapper';
import type { TreatmentDetailDto, TreatmentListItemDtoPagedResult } from '@/app/features/treatments/models/treatment-api.model';
import type { CreateTreatmentRequest } from '@/app/features/treatments/models/treatment-create.model';
import type { TreatmentsListQuery } from '@/app/features/treatments/models/treatment-query.model';
import type { TreatmentDetailVm, TreatmentEditVm, TreatmentListItemVm } from '@/app/features/treatments/models/treatment-vm.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

export interface TreatmentsPagedVm {
    items: TreatmentListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class TreatmentsService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    getTreatments(query: TreatmentsListQuery): Observable<TreatmentsPagedVm> {
        const clinicFromAuth = this.auth.getClinicId()?.trim() ?? '';
        const merged: TreatmentsListQuery = {
            ...query,
            clinicId: query.clinicId?.trim() ? query.clinicId.trim() : clinicFromAuth || undefined
        };
        const params = treatmentsQueryToHttpParams(merged);
        return this.api.get<TreatmentListItemDtoPagedResult>(ApiEndpoints.treatments.list(), params).pipe(
            map((res) => mapPagedTreatmentsToVm(res)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Tedavi listesi yüklenemedi.')))
            )
        );
    }

    getTreatmentById(id: string): Observable<TreatmentDetailVm> {
        return this.api.get<TreatmentDetailDto>(ApiEndpoints.treatments.byId(id)).pipe(
            map((dto) => mapTreatmentDetailDtoToVm(dto)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Tedavi bulunamadı veya yüklenemedi.')))
            )
        );
    }

    getTreatmentForEditById(id: string): Observable<TreatmentEditVm> {
        return this.api.get<TreatmentDetailDto>(ApiEndpoints.treatments.byId(id)).pipe(
            map((dto) => mapTreatmentDetailDtoToEditVm(dto)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Tedavi düzenleme bilgileri yüklenemedi.')))
            )
        );
    }

    createTreatment(payload: CreateTreatmentRequest): Observable<{ id: string }> {
        let body: unknown;
        try {
            body = mapCreateTreatmentToApiBody(payload);
        } catch (e: unknown) {
            if (e instanceof Error && e.message === 'TREATMENT_WRITE_CLINIC_ID_REQUIRED') {
                return throwError(() => new Error('Aktif klinik kimliği eksik. Lütfen yeniden giriş yapın.'));
            }
            if (e instanceof Error && e.message === 'TREATMENT_WRITE_PET_ID_REQUIRED') {
                return throwError(() => new Error('Hayvan seçimi zorunludur.'));
            }
            if (e instanceof Error && e.message === 'TREATMENT_WRITE_DATE_REQUIRED') {
                return throwError(() => new Error('Tedavi tarihi / saati zorunludur.'));
            }
            if (e instanceof Error && e.message === 'TREATMENT_WRITE_TITLE_REQUIRED') {
                return throwError(() => new Error('Başlık zorunludur.'));
            }
            if (e instanceof Error && e.message === 'TREATMENT_WRITE_DESCRIPTION_REQUIRED') {
                return throwError(() => new Error('Açıklama zorunludur.'));
            }
            return throwError(() => (e instanceof Error ? e : new Error('Tedavi oluşturulamadı.')));
        }
        return this.api.post<unknown>(ApiEndpoints.treatments.list(), body).pipe(
            map((raw) => {
                const id = extractCreatedTreatmentIdFromPostResponse(raw);
                if (!id) {
                    throw new Error('TREATMENT_CREATE_NO_ID_IN_RESPONSE');
                }
                return { id };
            }),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    return throwError(() => new Error(messageFromHttpError(err, 'Tedavi oluşturulamadı.')));
                }
                if (err instanceof Error && err.message === 'TREATMENT_CREATE_NO_ID_IN_RESPONSE') {
                    return throwError(
                        () =>
                            new Error(
                                'Sunucu yanıtında tedavi kimliği okunamadı. Kayıt oluşmuş olabilir; listeyi kontrol edin.'
                            )
                    );
                }
                return throwError(() => (err instanceof Error ? err : new Error('Tedavi oluşturulamadı.')));
            })
        );
    }

    updateTreatment(id: string, payload: CreateTreatmentRequest): Observable<void> {
        let body: unknown;
        try {
            body = mapCreateTreatmentToApiBody(payload);
        } catch (e: unknown) {
            if (e instanceof Error && e.message === 'TREATMENT_WRITE_CLINIC_ID_REQUIRED') {
                return throwError(() => new Error('Aktif klinik kimliği eksik. Lütfen yeniden giriş yapın.'));
            }
            if (e instanceof Error && e.message === 'TREATMENT_WRITE_PET_ID_REQUIRED') {
                return throwError(() => new Error('Hayvan seçimi zorunludur.'));
            }
            if (e instanceof Error && e.message === 'TREATMENT_WRITE_DATE_REQUIRED') {
                return throwError(() => new Error('Tedavi tarihi / saati zorunludur.'));
            }
            if (e instanceof Error && e.message === 'TREATMENT_WRITE_TITLE_REQUIRED') {
                return throwError(() => new Error('Başlık zorunludur.'));
            }
            if (e instanceof Error && e.message === 'TREATMENT_WRITE_DESCRIPTION_REQUIRED') {
                return throwError(() => new Error('Açıklama zorunludur.'));
            }
            return throwError(() => (e instanceof Error ? e : new Error('Tedavi güncellenemedi.')));
        }
        return this.api.put<unknown>(ApiEndpoints.treatments.byId(id), body).pipe(
            map(() => void 0),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    return throwError(() => err);
                }
                return throwError(() => (err instanceof Error ? err : new Error('Tedavi güncellenemedi.')));
            })
        );
    }
}

function extractCreatedTreatmentIdFromPostResponse(body: unknown): string | null {
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
    const idKeys = ['id', 'Id', 'treatmentId', 'TreatmentId'];
    for (const k of idKeys) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
        if (typeof v === 'number' && !Number.isNaN(v)) {
            return String(v);
        }
    }
    const wrappers = ['data', 'Data', 'value', 'Value', 'result', 'Result', 'treatment', 'Treatment'];
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
