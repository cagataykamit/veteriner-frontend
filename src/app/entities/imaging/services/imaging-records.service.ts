import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import type {
    CreateImagingRecordRequest,
    ImagingRecordDetailDto,
    ImagingRecordDetailVm,
    ImagingRecordListItemDtoPagedResult,
    ImagingRecordsListQuery,
    ImagingRecordsPagedVm
} from '@/app/entities/imaging/models/imaging.model';
import { imagingQueryToHttpParams, mapImagingDetailDtoToVm } from '@/app/entities/imaging/utils/imaging.utils';
import { messageFromHttpError, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';

/** Görüntüleme kayıtları (`docs/IMAGING_API_CONTRACT.md` §4); dosyalar `StoredFilesService` ile `filesOwner` kökünden. */
@Injectable({ providedIn: 'root' })
export class ImagingRecordsService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    /** Sahip kaydın dosya uçları kökü. */
    filesOwner(id: string): string {
        return ApiEndpoints.imagingRecords.filesOwner(id);
    }

    list(query: ImagingRecordsListQuery): Observable<ImagingRecordsPagedVm> {
        const clinicId = query.clinicId?.trim() || this.auth.getClinicId()?.trim() || undefined;

        return this.api
            .get<ImagingRecordListItemDtoPagedResult>(ApiEndpoints.imagingRecords.list(), imagingQueryToHttpParams({ ...query, clinicId }))
            .pipe(
                map((r) => ({ items: r.items ?? [], page: r.page, pageSize: r.pageSize, totalItems: r.totalItems, totalPages: r.totalPages })),
                catchError((err: HttpErrorResponse) => throwError(() => new Error(messageFromHttpError(err, 'Görüntüleme kayıtları yüklenemedi.'))))
            );
    }

    getById(id: string): Observable<ImagingRecordDetailVm> {
        return this.api.get<ImagingRecordDetailDto>(ApiEndpoints.imagingRecords.byId(id)).pipe(
            map(mapImagingDetailDtoToVm),
            catchError((err: HttpErrorResponse) => throwError(() => new Error(messageFromHttpError(err, 'Kayıt bulunamadı veya yüklenemedi.'))))
        );
    }

    /** 201 + kimlik. Hata ham `HttpErrorResponse` olarak iletilir (alan hataları formda). */
    create(request: CreateImagingRecordRequest): Observable<string> {
        return this.api.post<string>(ApiEndpoints.imagingRecords.list(), request).pipe(map((id) => String(id)));
    }

    /** Gerekçeli iptal; dosyaların erişimi kapanır. */
    cancel(id: string, reason: string, rowVersion: string): Observable<void> {
        return this.api.post<unknown>(ApiEndpoints.imagingRecords.cancel(id), { reason: reason.trim(), rowVersion }).pipe(
            map(() => void 0),
            catchError((err: HttpErrorResponse) =>
                throwError(
                    () =>
                        new Error(
                            problemCodeFromHttpError(err) === 'ImagingRecords.ConcurrencyConflict'
                                ? 'Kayıt başka bir oturumda değişti; sayfayı yenileyip tekrar deneyin.'
                                : messageFromHttpError(err, 'Görüntüleme kaydı iptal edilemedi.')
                        )
                )
            )
        );
    }
}
