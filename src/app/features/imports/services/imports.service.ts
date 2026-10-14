import { HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type {
    ImportBatchDto,
    ImportBatchPageDto,
    ImportBatchStatus,
    ImportCommitRequestDto,
    ImportFileFormat,
    ImportMappingRequestDto,
    ImportPreviewDto,
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

    /** B4 (taslak): uç yayında değilse 404/405/501 döner; çağıran `isEndpointUnavailable` ile ayırır. */
    commit(id: string, body: ImportCommitRequestDto): Observable<ImportBatchDto> {
        return this.api.post<ImportBatchDto>(ApiEndpoints.imports.commit(id), body);
    }

    /** B4 (taslak): `confirmEmailCount` önizlemedeki `emailsWithinReminderWindow` ile aynı olmalı. */
    releaseReminders(id: string, confirmEmailCount: number): Observable<ImportBatchDto> {
        return this.api.post<ImportBatchDto>(ApiEndpoints.imports.releaseReminders(id), { confirmEmailCount });
    }
}
