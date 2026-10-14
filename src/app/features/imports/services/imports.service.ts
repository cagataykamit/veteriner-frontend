import { HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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
    ImportTable
} from '@/app/features/imports/models/import-api.model';

/**
 * Veri içe aktarma uçları. Hatalar HttpErrorResponse olarak iletilir (kod ve `extensions.batchId` okunabilsin);
 * çağıran `importErrorMessage` ile Türkçe mesaj üretir. Dosya içeriği ve satır verisi günlüğe yazılmaz.
 */
@Injectable({ providedIn: 'root' })
export class ImportsService {
    private readonly api = inject(ApiClient);

    listBatches(page: number, pageSize: number, status?: ImportBatchStatus): Observable<ImportBatchPageDto> {
        let params = new HttpParams().set('page', page).set('pageSize', pageSize);
        if (status) {
            params = params.set('status', status);
        }
        return this.api.get<ImportBatchPageDto>(ApiEndpoints.imports.batches(), params);
    }

    getBatch(id: string): Observable<ImportBatchDto> {
        return this.api.get<ImportBatchDto>(ApiEndpoints.imports.batchById(id));
    }

    /** Multipart yükleme: `file` (XLSX) veya `customersFile`/`petsFile`/`vaccinationsFile` (CSV). */
    createBatch(form: FormData): Observable<ImportBatchDto> {
        return this.api.post<ImportBatchDto>(ApiEndpoints.imports.batches(), form);
    }

    saveMapping(id: string, body: ImportMappingRequestDto): Observable<ImportBatchDto> {
        return this.api.put<ImportBatchDto>(ApiEndpoints.imports.mapping(id), body);
    }

    /** Senkron: yanıt güncel parti nesnesidir (`Validated` | `ValidationFailed`). */
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

    downloadErrorReport(id: string, format: ImportFileFormat): Observable<HttpResponse<Blob>> {
        return this.api.getBlob(ApiEndpoints.imports.errors(id), new HttpParams().set('format', format));
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

    getProgress(id: string): Observable<ImportCommitProgressDto> {
        return this.api.get<ImportCommitProgressDto>(ApiEndpoints.imports.progress(id));
    }

    /** B4: `confirmEmailCount` güncel `emailsWithinReminderWindow` ile aynı olmalı; değilse 409 `Imports.ReminderImpactChanged`. */
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
