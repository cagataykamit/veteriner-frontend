import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import {
    mapCreateVaccinationToApiBody,
    mapVaccinationDetailDtoToEditVm,
    mapPagedVaccinationsToVm,
    mapVaccinationDetailDtoToVm,
    vaccinationsQueryToHttpParams
} from '@/app/features/vaccinations/data/vaccination.mapper';
import type { VaccinationDetailDto, VaccinationListItemDtoPagedResult } from '@/app/features/vaccinations/models/vaccination-api.model';
import type { CreateVaccinationRequest } from '@/app/features/vaccinations/models/vaccination-create.model';
import type { VaccinationsListQuery } from '@/app/features/vaccinations/models/vaccination-query.model';
import type { VaccinationDetailVm, VaccinationEditVm, VaccinationListItemVm } from '@/app/features/vaccinations/models/vaccination-vm.model';
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

    getVaccinationForEditById(id: string): Observable<VaccinationEditVm> {
        return this.api.get<VaccinationDetailDto>(ApiEndpoints.vaccinations.byId(id)).pipe(
            map((dto) => mapVaccinationDetailDtoToEditVm(dto)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Aşı düzenleme bilgileri yüklenemedi.')))
            )
        );
    }

    /**
     * POST liste endpoint’i (muayene/randevu ile aynı varsayım).
     * Yanıt gövdesinde tam `VaccinationDetailDto` ve `id` beklenir; yalnızca `{ id }` dönen sarmalayıcılar için mapper genişletilir.
     */
    createVaccination(payload: CreateVaccinationRequest): Observable<{ id: string }> {
        const body = mapCreateVaccinationToApiBody(payload);
        return this.api.post<unknown>(ApiEndpoints.vaccinations.list(), body).pipe(
            map((raw) => {
                const id = extractCreatedVaccinationIdFromPostResponse(raw);
                if (!id) {
                    throw new Error('VACCINATION_CREATE_NO_ID_IN_RESPONSE');
                }
                return { id };
            }),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    return throwError(() => new Error(messageFromHttpError(err, 'Aşı kaydı oluşturulamadı.')));
                }
                if (err instanceof Error && err.message === 'VACCINATION_CREATE_NO_ID_IN_RESPONSE') {
                    return throwError(
                        () =>
                            new Error(
                                'Sunucu yanıtında aşı kaydı kimliği okunamadı. Kayıt oluşmuş olabilir; aşı listesini kontrol edin.'
                            )
                    );
                }
                return throwError(() => (err instanceof Error ? err : new Error('Aşı kaydı oluşturulamadı.')));
            })
        );
    }

    updateVaccination(id: string, payload: CreateVaccinationRequest): Observable<void> {
        const body = mapCreateVaccinationToApiBody(payload);
        return this.api.put<unknown>(ApiEndpoints.vaccinations.byId(id), body).pipe(
            map(() => void 0),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    return throwError(() => err);
                }
                return throwError(() =>
                    err instanceof Error ? err : new Error('Aşı kaydı güncellenemedi.')
                );
            })
        );
    }
}

function extractCreatedVaccinationIdFromPostResponse(body: unknown): string | null {
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
    const idKeys = ['id', 'Id', 'vaccinationId', 'VaccinationId'];
    for (const k of idKeys) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
        if (typeof v === 'number' && !Number.isNaN(v)) {
            return String(v);
        }
    }
    const wrappers = ['data', 'Data', 'value', 'Value', 'result', 'Result', 'vaccination', 'Vaccination'];
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
