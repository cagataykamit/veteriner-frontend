import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    mapCreatePrescriptionToApiBody,
    mapPagedPrescriptionsToVm,
    mapPrescriptionDetailDtoToEditVm,
    mapPrescriptionDetailDtoToVm,
    prescriptionsQueryToHttpParams
} from '@/app/features/prescriptions/data/prescription.mapper';
import type { PrescriptionDetailDto, PrescriptionListItemDtoPagedResult } from '@/app/features/prescriptions/models/prescription-api.model';
import type { CreatePrescriptionRequest } from '@/app/features/prescriptions/models/prescription-create.model';
import type { PrescriptionsListQuery } from '@/app/features/prescriptions/models/prescription-query.model';
import type { PrescriptionDetailVm, PrescriptionEditVm, PrescriptionListItemVm } from '@/app/features/prescriptions/models/prescription-vm.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

export interface PrescriptionsPagedVm {
    items: PrescriptionListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class PrescriptionsService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    getPrescriptions(query: PrescriptionsListQuery): Observable<PrescriptionsPagedVm> {
        const clinicFromAuth = this.auth.getClinicId()?.trim() ?? '';
        const merged: PrescriptionsListQuery = {
            ...query,
            clinicId: query.clinicId?.trim() ? query.clinicId.trim() : clinicFromAuth || undefined
        };
        const params = prescriptionsQueryToHttpParams(merged);
        return this.api.get<PrescriptionListItemDtoPagedResult>(ApiEndpoints.prescriptions.list(), params).pipe(
            map((res) => mapPagedPrescriptionsToVm(res)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Reçete listesi yüklenemedi.')))
            )
        );
    }

    getPrescriptionById(id: string): Observable<PrescriptionDetailVm> {
        return this.api.get<PrescriptionDetailDto>(ApiEndpoints.prescriptions.byId(id)).pipe(
            map((dto) => mapPrescriptionDetailDtoToVm(dto)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Reçete bulunamadı veya yüklenemedi.')))
            )
        );
    }

    getPrescriptionForEditById(id: string): Observable<PrescriptionEditVm> {
        return this.api.get<PrescriptionDetailDto>(ApiEndpoints.prescriptions.byId(id)).pipe(
            map((dto) => mapPrescriptionDetailDtoToEditVm(dto)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Reçete düzenleme bilgileri yüklenemedi.')))
            )
        );
    }

    createPrescription(payload: CreatePrescriptionRequest): Observable<{ id: string }> {
        let body: unknown;
        try {
            body = mapCreatePrescriptionToApiBody(payload);
        } catch (e: unknown) {
            if (e instanceof Error && e.message === 'PRESCRIPTION_WRITE_CLINIC_ID_REQUIRED') {
                return throwError(() => new Error('Aktif klinik kimliği eksik. Lütfen yeniden giriş yapın.'));
            }
            if (e instanceof Error && e.message === 'PRESCRIPTION_WRITE_PET_ID_REQUIRED') {
                return throwError(() => new Error('Hayvan seçimi zorunludur.'));
            }
            if (e instanceof Error && e.message === 'PRESCRIPTION_WRITE_DATE_REQUIRED') {
                return throwError(() => new Error('Reçete tarihi / saati zorunludur.'));
            }
            if (e instanceof Error && e.message === 'PRESCRIPTION_WRITE_TITLE_REQUIRED') {
                return throwError(() => new Error('Başlık zorunludur.'));
            }
            if (e instanceof Error && e.message === 'PRESCRIPTION_WRITE_CONTENT_REQUIRED') {
                return throwError(() => new Error('İçerik zorunludur.'));
            }
            return throwError(() => (e instanceof Error ? e : new Error('Reçete oluşturulamadı.')));
        }
        return this.api.post<unknown>(ApiEndpoints.prescriptions.list(), body).pipe(
            map((raw) => {
                const id = extractCreatedPrescriptionIdFromPostResponse(raw);
                if (!id) {
                    throw new Error('PRESCRIPTION_CREATE_NO_ID_IN_RESPONSE');
                }
                return { id };
            }),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    // Create formunda alan bazlı parse için ham HttpErrorResponse korunur.
                    return throwError(() => err);
                }
                if (err instanceof Error && err.message === 'PRESCRIPTION_CREATE_NO_ID_IN_RESPONSE') {
                    return throwError(
                        () =>
                            new Error(
                                'Sunucu yanıtında reçete kimliği okunamadı. Kayıt oluşmuş olabilir; listeyi kontrol edin.'
                            )
                    );
                }
                return throwError(() => (err instanceof Error ? err : new Error('Reçete oluşturulamadı.')));
            })
        );
    }

    updatePrescription(id: string, payload: CreatePrescriptionRequest): Observable<void> {
        let body: unknown;
        try {
            body = mapCreatePrescriptionToApiBody(payload);
        } catch (e: unknown) {
            if (e instanceof Error && e.message === 'PRESCRIPTION_WRITE_CLINIC_ID_REQUIRED') {
                return throwError(() => new Error('Aktif klinik kimliği eksik. Lütfen yeniden giriş yapın.'));
            }
            if (e instanceof Error && e.message === 'PRESCRIPTION_WRITE_PET_ID_REQUIRED') {
                return throwError(() => new Error('Hayvan seçimi zorunludur.'));
            }
            if (e instanceof Error && e.message === 'PRESCRIPTION_WRITE_DATE_REQUIRED') {
                return throwError(() => new Error('Reçete tarihi / saati zorunludur.'));
            }
            if (e instanceof Error && e.message === 'PRESCRIPTION_WRITE_TITLE_REQUIRED') {
                return throwError(() => new Error('Başlık zorunludur.'));
            }
            if (e instanceof Error && e.message === 'PRESCRIPTION_WRITE_CONTENT_REQUIRED') {
                return throwError(() => new Error('İçerik zorunludur.'));
            }
            return throwError(() => (e instanceof Error ? e : new Error('Reçete güncellenemedi.')));
        }
        return this.api.put<unknown>(ApiEndpoints.prescriptions.byId(id), body).pipe(
            map(() => void 0),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    return throwError(() => err);
                }
                return throwError(() => (err instanceof Error ? err : new Error('Reçete güncellenemedi.')));
            })
        );
    }
}

function extractCreatedPrescriptionIdFromPostResponse(body: unknown): string | null {
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
    const idKeys = ['id', 'Id', 'prescriptionId', 'PrescriptionId'];
    for (const k of idKeys) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
        if (typeof v === 'number' && !Number.isNaN(v)) {
            return String(v);
        }
    }
    const wrappers = ['data', 'Data', 'value', 'Value', 'result', 'Result', 'prescription', 'Prescription'];
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
