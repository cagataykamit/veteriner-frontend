import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    mapCancelledVitalPoints,
    mapCancelVitalMeasurementToApiBody,
    mapCreateVitalMeasurementToApiBody,
    mapUpdateVitalMeasurementToApiBody,
    mapVitalMeasurementDetailDtoToVm,
    mapVitalSeriesDtoToVm,
    vitalCancelledQueryToHttpParams,
    vitalSeriesQueryToHttpParams
} from '@/app/entities/vital-measurement/data/vital-measurement.mapper';
import type {
    VitalMeasurementDetailDto,
    VitalMeasurementPagedResultDto,
    VitalMeasurementWriteResultDto,
    VitalSeriesDto
} from '@/app/entities/vital-measurement/models/vital-measurement-api.model';
import type {
    CreateVitalMeasurementRequest,
    VitalCancelledQuery,
    VitalMeasurementDetailVm,
    VitalMeasurementWrite,
    VitalPointVm,
    VitalSeriesQuery,
    VitalSeriesVm
} from '@/app/entities/vital-measurement/models/vital-measurement-vm.model';
import { messageFromHttpError, toUserError } from '@/app/shared/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class VitalMeasurementsService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    /** Eğilim: vital ölçümleri ile muayene vitalleri birleşik, artan zaman sırasında (§6). */
    getSeries(query: VitalSeriesQuery): Observable<VitalSeriesVm> {
        return this.api.get<VitalSeriesDto>(ApiEndpoints.vitalMeasurements.series(), vitalSeriesQueryToHttpParams(query)).pipe(map(mapVitalSeriesDtoToVm), toUserError('Vital ölçümleri yüklenemedi.'));
    }

    /** İptal edilmiş ölçümler; eğilim ucu bunları döndürmediği için listeden okunur (§2.5). */
    getCancelled(query: VitalCancelledQuery): Observable<VitalPointVm[]> {
        return this.api
            .get<VitalMeasurementPagedResultDto>(ApiEndpoints.vitalMeasurements.list(), vitalCancelledQueryToHttpParams(query))
            .pipe(map(mapCancelledVitalPoints), toUserError('İptal edilen ölçümler yüklenemedi.'));
    }

    /** Not, iptal bilgisi ve `rowVersion` yalnız detayda gelir; iptal edilmiş kayıt da döner. */
    getById(id: string): Observable<VitalMeasurementDetailVm> {
        return this.api.get<VitalMeasurementDetailDto>(ApiEndpoints.vitalMeasurements.byId(id)).pipe(map(mapVitalMeasurementDetailDtoToVm), toUserError('Ölçüm yüklenemedi.'));
    }

    create(req: CreateVitalMeasurementRequest): Observable<{ id: string }> {
        const clinicId = this.auth.getClinicId()?.trim() ?? '';

        if (!clinicId) {
            return throwError(() => new Error('Aktif klinik bulunamadı. Lütfen yeniden giriş yapın.'));
        }

        return this.api.post<string>(ApiEndpoints.vitalMeasurements.list(), mapCreateVitalMeasurementToApiBody(clinicId, req)).pipe(
            map((id) => ({ id })),
            toUserError('Ölçüm kaydedilemedi.')
        );
    }

    /**
     * PUT; `rowVersion` zorunludur. Çakışma kodunu (`VitalMeasurements.ConcurrencyConflict`) ayrıştırabilmek için
     * hata ham `HttpErrorResponse` olarak iletilir.
     */
    update(id: string, write: VitalMeasurementWrite, rowVersion: string): Observable<VitalMeasurementWriteResultDto> {
        return this.api.put<VitalMeasurementWriteResultDto>(ApiEndpoints.vitalMeasurements.byId(id), mapUpdateVitalMeasurementToApiBody(write, rowVersion));
    }

    /** Gerekçeli iptal (silme yok, D8); `rowVersion`: kaydın okunduğu sürüm. Hatalar Türkçe `Error` olarak iletilir. */
    cancel(id: string, reason: string, rowVersion: string): Observable<VitalMeasurementWriteResultDto> {
        return this.api
            .post<VitalMeasurementWriteResultDto>(ApiEndpoints.vitalMeasurements.cancel(id), mapCancelVitalMeasurementToApiBody(reason, rowVersion))
            .pipe(
                catchError((err: unknown) =>
                    throwError(() => (err instanceof HttpErrorResponse ? new Error(messageFromHttpError(err, 'Ölçüm iptal edilemedi.')) : err instanceof Error ? err : new Error('Ölçüm iptal edilemedi.')))
                )
            );
    }
}
