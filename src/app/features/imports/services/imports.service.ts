import { HttpEventType, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { filter, map, Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type {
    ImportBatchDto,
    ImportBatchPageDto,
    ImportBatchStatus,
    ImportCommitProgressDto,
    ImportCommitRequestDto,
    ImportFileFormat,
    ImportMappingRequestDto,
    ImportPreviewDto,
    ImportReleaseRemindersResultDto,
    ImportRollbackPreviewDto,
    ImportRollbackRequestDto,
    ImportRowPageDto,
    ImportRowsQuery,
    ImportSourceProfileDto,
    ImportTable,
    ImportUploadEvent
} from '@/app/features/imports/models/import-api.model';

/**
 * Veri içe aktarma uçları. Hatalar HttpErrorResponse olarak iletilir (kod ve `extensions.batchId` okunabilsin);
 * çağıran `importErrorMessage` ile Türkçe mesaj üretir. Dosya içeriği ve satır verisi günlüğe yazılmaz.
 */
@Injectable({ providedIn: 'root' })
export class ImportsService {
    private readonly api = inject(ApiClient);

    /**
     * Parti listesi. `status` verilmezse sunucu kapanmış partileri (geri alınmış, silinmiş, süresi dolmuş taslak) göstermez;
     * `includeClosed` hepsini getirir (sözleşme 7.5).
     */
    listBatches(page: number, pageSize: number, status?: ImportBatchStatus, includeClosed = false): Observable<ImportBatchPageDto> {
        let params = new HttpParams().set('page', page).set('pageSize', pageSize);

        if (status) {
            params = params.set('status', status);
        } else if (includeClosed) {
            params = params.set('includeClosed', true);
        }

        return this.api.get<ImportBatchPageDto>(ApiEndpoints.imports.batches(), params);
    }

    getBatch(id: string): Observable<ImportBatchDto> {
        return this.api.get<ImportBatchDto>(ApiEndpoints.imports.batchById(id));
    }

    /** "Hangi programdan geliyorsunuz?" seçenekleri (TIER-021). */
    getSourceProfiles(): Observable<ImportSourceProfileDto[]> {
        return this.api.get<ImportSourceProfileDto[]>(ApiEndpoints.imports.sourceProfiles());
    }

    /**
     * Multipart yükleme: `file` (XLSX) veya tablo başına CSV alanı (`IMPORT_CSV_FIELD`, sözleşme 12.1); isteğe bağlı `sourceProfile`.
     * Gönderim yüzdesi (`progress`) ve sunucu yanıtı (`done`) olayları; gönderim bitince sunucu dosyayı okur ve dönüştürür
     * (büyük E-vet yedeğinde onlarca saniye). Hatalar HttpErrorResponse olarak iletilir.
     */
    createBatch(form: FormData): Observable<ImportUploadEvent> {
        return this.api.upload<ImportBatchDto>(ApiEndpoints.imports.batches(), form).pipe(
            filter((e) => e.type === HttpEventType.UploadProgress || e.type === HttpEventType.Response),
            map((e): ImportUploadEvent =>
                e.type === HttpEventType.UploadProgress
                    ? { type: 'progress', percent: e.total ? Math.min(100, Math.round((e.loaded / e.total) * 100)) : 0 }
                    : { type: 'done', batch: (e as HttpResponse<ImportBatchDto>).body! }
            )
        );
    }

    saveMapping(id: string, body: ImportMappingRequestDto): Observable<ImportBatchDto> {
        return this.api.put<ImportBatchDto>(ApiEndpoints.imports.mapping(id), body);
    }

    /**
     * K13: doğrulamayı arka plan işi olarak kuyruğa alır ve hemen döner. 202 yeni iş, 200 parti zaten `Validating`
     * (yeni iş başlamaz); ikisinde de gövde `Validating` partidir (`validationId` null). Sonuç `getProgress` yoklanarak
     * beklenir; `validationId` iş bittikten sonra `getBatch`/`getPreview` ile okunur.
     */
    validate(id: string): Observable<ImportBatchDto> {
        return this.api.post<ImportBatchDto>(ApiEndpoints.imports.validate(id), {});
    }

    getPreview(id: string): Observable<ImportPreviewDto> {
        return this.api.get<ImportPreviewDto>(ApiEndpoints.imports.preview(id));
    }

    getRows(id: string, query: ImportRowsQuery): Observable<ImportRowPageDto> {
        let params = new HttpParams().set('page', query.page).set('pageSize', query.pageSize);

        if (query.table) {
            params = params.set('table', query.table);
        }

        if (query.status) {
            params = params.set('status', query.status);
        }

        if (query.code) {
            params = params.set('code', query.code);
        }

        return this.api.get<ImportRowPageDto>(ApiEndpoints.imports.rows(id), params);
    }

    /** Hata raporu; `skipped` ile bilerek atlanacak satırlar (isteğe bağlı tek neden kodu, sözleşme 7.8). */
    downloadErrorReport(id: string, format: ImportFileFormat, skipped?: { code?: string | null }): Observable<HttpResponse<Blob>> {
        let params = new HttpParams().set('format', format);

        if (skipped) {
            params = params.set('rows', 'skipped');

            if (skipped.code) params = params.set('code', skipped.code);
        }

        return this.api.getBlob(ApiEndpoints.imports.errors(id), params);
    }

    downloadTemplate(format: ImportFileFormat, table?: ImportTable): Observable<HttpResponse<Blob>> {
        let params = new HttpParams().set('format', format);

        if (format === 'csv' && table) {
            params = params.set('table', table);
        }

        return this.api.getBlob(ApiEndpoints.imports.template(), params);
    }

    discard(id: string): Observable<void> {
        return this.api.delete<void>(ApiEndpoints.imports.batchById(id));
    }

    /** B4: 202 yeni iş, 200 aynı `validationId` ile tekrar (yeni iş başlamaz); ikisinde de gövde parti özetidir. Uç dağıtılmamışsa 404/405/501; çağıran `isEndpointUnavailable` ile ayırır. */
    commit(id: string, body: ImportCommitRequestDto): Observable<ImportBatchDto> {
        return this.api.post<ImportBatchDto>(ApiEndpoints.imports.commit(id), body);
    }

    /** Doğrulama, uygulama ve geri alma işinin ilerlemesi; yoklama `pollImportProgress` ile yapılır. */
    getProgress(id: string): Observable<ImportCommitProgressDto> {
        return this.api.get<ImportCommitProgressDto>(ApiEndpoints.imports.progress(id));
    }

    /** `confirmEmailCount` güncel `totalEmailsWithinReminderWindow` (aşı + randevu, §12.6) ile aynı olmalı; değilse 409 `Imports.ReminderImpactChanged`. */
    releaseReminders(id: string, confirmEmailCount: number): Observable<ImportReleaseRemindersResultDto> {
        return this.api.post<ImportReleaseRemindersResultDto>(ApiEndpoints.imports.releaseReminders(id), { confirmEmailCount });
    }

    getRollbackPreview(id: string): Observable<ImportRollbackPreviewDto> {
        return this.api.get<ImportRollbackPreviewDto>(ApiEndpoints.imports.rollbackPreview(id));
    }

    /** B5: 202 yeni iş, 200 aynı `requestId` ile tekrar (yeni iş başlamaz); ikisinde de gövde parti özetidir. Engel varsa 409 `Imports.RollbackBlocked`. */
    rollback(id: string, body: ImportRollbackRequestDto): Observable<ImportBatchDto> {
        return this.api.post<ImportBatchDto>(ApiEndpoints.imports.rollback(id), body);
    }
}
