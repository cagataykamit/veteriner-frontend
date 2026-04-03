import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    mapCreateHospitalizationToApiBody,
    mapDischargeHospitalizationToApiBody,
    mapHospitalizationDetailDtoToEditVm,
    mapHospitalizationDetailDtoToVm,
    mapPagedHospitalizationsToVm,
    hospitalizationsQueryToHttpParams
} from '@/app/features/hospitalizations/data/hospitalization.mapper';
import type {
    HospitalizationDetailDto,
    HospitalizationListItemDtoPagedResult
} from '@/app/features/hospitalizations/models/hospitalization-api.model';
import type {
    CreateHospitalizationRequest,
    DischargeHospitalizationRequest
} from '@/app/features/hospitalizations/models/hospitalization-create.model';
import type { HospitalizationsListQuery } from '@/app/features/hospitalizations/models/hospitalization-query.model';
import type {
    HospitalizationDetailVm,
    HospitalizationEditVm,
    HospitalizationListItemVm
} from '@/app/features/hospitalizations/models/hospitalization-vm.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

export interface HospitalizationsPagedVm {
    items: HospitalizationListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class HospitalizationsService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    getHospitalizations(query: HospitalizationsListQuery): Observable<HospitalizationsPagedVm> {
        const clinicFromAuth = this.auth.getClinicId()?.trim() ?? '';
        const merged: HospitalizationsListQuery = {
            ...query,
            clinicId: query.clinicId?.trim() ? query.clinicId.trim() : clinicFromAuth || undefined
        };
        const params = hospitalizationsQueryToHttpParams(merged);
        return this.api
            .get<HospitalizationListItemDtoPagedResult>(ApiEndpoints.hospitalizations.list(), params)
            .pipe(
                map((res) => mapPagedHospitalizationsToVm(res)),
                catchError((err: HttpErrorResponse) =>
                    throwError(() => new Error(messageFromHttpError(err, 'Yatış listesi yüklenemedi.')))
                )
            );
    }

    getHospitalizationById(id: string): Observable<HospitalizationDetailVm> {
        return this.api.get<HospitalizationDetailDto>(ApiEndpoints.hospitalizations.byId(id)).pipe(
            map((dto) => mapHospitalizationDetailDtoToVm(dto)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Kayıt bulunamadı veya yüklenemedi.')))
            )
        );
    }

    getHospitalizationForEditById(id: string): Observable<HospitalizationEditVm> {
        return this.api.get<HospitalizationDetailDto>(ApiEndpoints.hospitalizations.byId(id)).pipe(
            map((dto) => mapHospitalizationDetailDtoToEditVm(dto)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Düzenleme bilgileri yüklenemedi.')))
            )
        );
    }

    createHospitalization(payload: CreateHospitalizationRequest): Observable<{ id: string }> {
        let body: unknown;
        try {
            body = mapCreateHospitalizationToApiBody(payload);
        } catch (e: unknown) {
            if (e instanceof Error && e.message === 'HOSPITALIZATION_WRITE_CLINIC_ID_REQUIRED') {
                return throwError(() => new Error('Aktif klinik kimliği eksik. Lütfen yeniden giriş yapın.'));
            }
            if (e instanceof Error && e.message === 'HOSPITALIZATION_WRITE_PET_ID_REQUIRED') {
                return throwError(() => new Error('Hayvan seçimi zorunludur.'));
            }
            if (e instanceof Error && e.message === 'HOSPITALIZATION_WRITE_ADMITTED_AT_REQUIRED') {
                return throwError(() => new Error('Yatış tarihi / saati zorunludur.'));
            }
            if (e instanceof Error && e.message === 'HOSPITALIZATION_WRITE_REASON_REQUIRED') {
                return throwError(() => new Error('Yatış nedeni zorunludur.'));
            }
            return throwError(() => (e instanceof Error ? e : new Error('Kayıt oluşturulamadı.')));
        }
        return this.api.post<unknown>(ApiEndpoints.hospitalizations.list(), body).pipe(
            map((raw) => {
                const hid = extractCreatedHospitalizationIdFromPostResponse(raw);
                if (!hid) {
                    throw new Error('HOSPITALIZATION_CREATE_NO_ID_IN_RESPONSE');
                }
                return { id: hid };
            }),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    return throwError(() => err);
                }
                if (err instanceof Error && err.message === 'HOSPITALIZATION_CREATE_NO_ID_IN_RESPONSE') {
                    return throwError(
                        () =>
                            new Error(
                                'Sunucu yanıtında kayıt kimliği okunamadı. Kayıt oluşmuş olabilir; listeyi kontrol edin.'
                            )
                    );
                }
                return throwError(() => (err instanceof Error ? err : new Error('Kayıt oluşturulamadı.')));
            })
        );
    }

    updateHospitalization(id: string, payload: CreateHospitalizationRequest): Observable<void> {
        let body: unknown;
        try {
            body = mapCreateHospitalizationToApiBody(payload);
        } catch (e: unknown) {
            if (e instanceof Error && e.message === 'HOSPITALIZATION_WRITE_CLINIC_ID_REQUIRED') {
                return throwError(() => new Error('Aktif klinik kimliği eksik. Lütfen yeniden giriş yapın.'));
            }
            if (e instanceof Error && e.message === 'HOSPITALIZATION_WRITE_PET_ID_REQUIRED') {
                return throwError(() => new Error('Hayvan seçimi zorunludur.'));
            }
            if (e instanceof Error && e.message === 'HOSPITALIZATION_WRITE_ADMITTED_AT_REQUIRED') {
                return throwError(() => new Error('Yatış tarihi / saati zorunludur.'));
            }
            if (e instanceof Error && e.message === 'HOSPITALIZATION_WRITE_REASON_REQUIRED') {
                return throwError(() => new Error('Yatış nedeni zorunludur.'));
            }
            return throwError(() => (e instanceof Error ? e : new Error('Kayıt güncellenemedi.')));
        }
        return this.api.put<unknown>(ApiEndpoints.hospitalizations.byId(id), body).pipe(
            map(() => void 0),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    return throwError(() => err);
                }
                return throwError(() => (err instanceof Error ? err : new Error('Kayıt güncellenemedi.')));
            })
        );
    }

    dischargeHospitalization(id: string, payload: DischargeHospitalizationRequest): Observable<void> {
        let body: unknown;
        try {
            body = mapDischargeHospitalizationToApiBody(payload.dischargedAtUtc, payload.notes);
        } catch (e: unknown) {
            if (e instanceof Error && e.message === 'HOSPITALIZATION_DISCHARGE_DATE_REQUIRED') {
                return throwError(() => new Error('Taburcu tarihi / saati zorunludur.'));
            }
            return throwError(() => (e instanceof Error ? e : new Error('Taburcu işlemi yapılamadı.')));
        }
        return this.api.post<unknown>(ApiEndpoints.hospitalizations.discharge(id), body).pipe(
            map(() => void 0),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    return throwError(() => err);
                }
                return throwError(() => (err instanceof Error ? err : new Error('Taburcu işlemi yapılamadı.')));
            })
        );
    }
}

function extractCreatedHospitalizationIdFromPostResponse(body: unknown): string | null {
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
    const idKeys = ['id', 'Id', 'hospitalizationId', 'HospitalizationId'];
    for (const k of idKeys) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
        if (typeof v === 'number' && !Number.isNaN(v)) {
            return String(v);
        }
    }
    const wrappers = ['data', 'Data', 'value', 'Value', 'result', 'Result', 'hospitalization', 'Hospitalization'];
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
