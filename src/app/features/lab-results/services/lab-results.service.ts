import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    mapCreateLabResultToApiBody,
    mapLabResultDetailDtoToEditVm,
    mapLabResultDetailDtoToVm,
    mapPagedLabResultsToVm,
    labResultsQueryToHttpParams
} from '@/app/features/lab-results/data/lab-result.mapper';
import type { LabResultCancelRequestDto, LabResultDetailDto, LabResultListItemDtoPagedResult } from '@/app/features/lab-results/models/lab-result-api.model';
import type { CreateLabResultRequest } from '@/app/features/lab-results/models/lab-result-create.model';
import type { LabResultsListQuery } from '@/app/features/lab-results/models/lab-result-query.model';
import type { LabResultDetailVm, LabResultEditVm, LabResultListItemVm } from '@/app/features/lab-results/models/lab-result-vm.model';
import { messageFromHttpError, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';

export interface LabResultsPagedVm {
    items: LabResultListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class LabResultsService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    getLabResults(query: LabResultsListQuery): Observable<LabResultsPagedVm> {
        const clinicFromAuth = this.auth.getClinicId()?.trim() ?? '';
        const merged: LabResultsListQuery = {
            ...query,
            clinicId: query.clinicId?.trim() ? query.clinicId.trim() : clinicFromAuth || undefined
        };
        const params = labResultsQueryToHttpParams(merged);

        return this.api.get<LabResultListItemDtoPagedResult>(ApiEndpoints.labResults.list(), params).pipe(
            map((res) => mapPagedLabResultsToVm(res)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Laboratuvar sonuçları yüklenemedi.')))
            )
        );
    }

    getLabResultById(id: string): Observable<LabResultDetailVm> {
        return this.api.get<LabResultDetailDto>(ApiEndpoints.labResults.byId(id)).pipe(
            map((dto) => mapLabResultDetailDtoToVm(dto)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Kayıt bulunamadı veya yüklenemedi.')))
            )
        );
    }

    getLabResultForEditById(id: string): Observable<LabResultEditVm> {
        return this.api.get<LabResultDetailDto>(ApiEndpoints.labResults.byId(id)).pipe(
            map((dto) => {
                const vm = mapLabResultDetailDtoToEditVm(dto);

                if (!vm.rowVersion) {
                    // Sürümsüz PUT backend'de 400 verir; sürüm yoksa düzenlemeye izin verme.
                    throw new Error('Sunucu kayıt sürümünü (rowVersion) döndürmedi; düzenleme yapılamaz.');
                }

                return vm;
            }),
            catchError((err: unknown) =>
                throwError(() =>
                    err instanceof HttpErrorResponse
                        ? new Error(messageFromHttpError(err, 'Düzenleme bilgileri yüklenemedi.'))
                        : err instanceof Error
                          ? err
                          : new Error('Düzenleme bilgileri yüklenemedi.')
                )
            )
        );
    }

    createLabResult(payload: CreateLabResultRequest): Observable<{ id: string }> {
        let body: unknown;

        try {
            body = mapCreateLabResultToApiBody(payload);
        } catch (e: unknown) {
            return throwError(() => labResultWriteBodyError(e, 'Kayıt oluşturulamadı.'));
        }

        return this.api.post<unknown>(ApiEndpoints.labResults.list(), body).pipe(
            map((raw) => {
                const id = extractCreatedLabResultIdFromPostResponse(raw);

                if (!id) {
                    throw new Error('LAB_RESULT_CREATE_NO_ID_IN_RESPONSE');
                }

                return { id };
            }),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    return throwError(() => err);
                }

                if (err instanceof Error && err.message === 'LAB_RESULT_CREATE_NO_ID_IN_RESPONSE') {
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

    /** PUT; `rowVersion` zorunlu. `Requested` kayıda sonuç yazılırsa sunucu `Resulted` yapar. Hata, kodu ayrıştırabilmek için ham `HttpErrorResponse` olarak iletilir. */
    updateLabResult(id: string, payload: CreateLabResultRequest): Observable<void> {
        let body: unknown;

        try {
            body = mapCreateLabResultToApiBody(payload);
        } catch (e: unknown) {
            return throwError(() => labResultWriteBodyError(e, 'Kayıt güncellenemedi.'));
        }

        return this.api.put<unknown>(ApiEndpoints.labResults.byId(id), body).pipe(
            map(() => void 0),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    return throwError(() => err);
                }

                return throwError(() => (err instanceof Error ? err : new Error('Kayıt güncellenemedi.')));
            })
        );
    }

    /** Gerekçeli iptal (`LabResults.Update`); `rowVersion`: ekranın açıldığı sürüm. Hatalar Türkçe `Error` olarak iletilir. */
    cancelLabResult(id: string, reason: string, rowVersion: string): Observable<void> {
        const body: LabResultCancelRequestDto = { reason: reason.trim(), rowVersion };

        return this.api.post<unknown>(ApiEndpoints.labResults.cancel(id), body).pipe(
            map(() => void 0),
            catchError((err: unknown) => {
                if (err instanceof HttpErrorResponse) {
                    return throwError(() => new Error(cancelErrorMessage(err)));
                }

                return throwError(() => (err instanceof Error ? err : new Error('Lab kaydı iptal edilemedi.')));
            })
        );
    }
}

const WRITE_BODY_ERRORS: Record<string, string> = {
    LAB_RESULT_WRITE_CLINIC_ID_REQUIRED: 'Aktif klinik kimliği eksik. Lütfen yeniden giriş yapın.',
    LAB_RESULT_WRITE_PET_ID_REQUIRED: 'Hasta seçimi zorunludur.',
    LAB_RESULT_WRITE_TEST_NAME_REQUIRED: 'Test adı zorunludur.',
    LAB_RESULT_WRITE_RESULT_INCOMPLETE: 'Sonuç tarihi ve sonuç metni birlikte girilmelidir.'
};

function labResultWriteBodyError(e: unknown, fallback: string): Error {
    const mapped = e instanceof Error ? WRITE_BODY_ERRORS[e.message] : undefined;

    return mapped ? new Error(mapped) : e instanceof Error ? e : new Error(fallback);
}

/** Sonuçlanmış kaydın kesinleşmiş muayenede iptali `Examinations.Finalized` ile reddedilir (sözleşme §3). */
function cancelErrorMessage(err: HttpErrorResponse): string {
    if (problemCodeFromHttpError(err) === 'Examinations.Finalized') {
        return 'Sonuçlanmış lab kaydı, kesinleşmiş muayeneye bağlı olduğu için iptal edilemedi. Gerekirse muayeneye ek not ekleyin.';
    }

    return messageFromHttpError(err, 'Lab kaydı iptal edilemedi.');
}

function extractCreatedLabResultIdFromPostResponse(body: unknown): string | null {
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
    const idKeys = ['id', 'Id', 'labResultId', 'LabResultId'];

    for (const k of idKeys) {
        const v = o[k];

        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }

        if (typeof v === 'number' && !Number.isNaN(v)) {
            return String(v);
        }
    }

    const wrappers = ['data', 'Data', 'value', 'Value', 'result', 'Result', 'labResult', 'LabResult'];

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
