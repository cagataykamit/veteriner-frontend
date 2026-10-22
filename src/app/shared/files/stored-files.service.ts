import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, filter, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { StoredFileAccessUrlDto, StoredFileDto, StoredFileUploadEvent, StoredFileVm } from '@/app/shared/files/stored-file.model';
import { mapStoredFileDtoToVm, storedFileProblemMessage } from '@/app/shared/files/stored-file.utils';
import { messageFromHttpError, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';
import { fileNameFromContentDisposition } from '@/app/shared/utils/file-download.utils';

/**
 * Sahip kayda bağlı dosyalar (görüntüleme, lab sonucu). `ownerPath` sahibin API köküdür (ör. `ApiEndpoints.imagingRecords.filesOwner(id)`).
 * Dosyalar statik adresle sunulmaz: `<img>` için kısa ömürlü imzalı URL, PDF/indirme için Bearer ile blob.
 */
@Injectable({ providedIn: 'root' })
export class StoredFilesService {
    private readonly api = inject(ApiClient);

    list(ownerPath: string): Observable<StoredFileVm[]> {
        return this.api.get<StoredFileDto[]>(ApiEndpoints.storedFiles.list(ownerPath)).pipe(
            map((rows) => (rows ?? []).map(mapStoredFileDtoToVm)),
            catchError((err: HttpErrorResponse) => throwError(() => new Error(fileErrorMessage(err, 'Dosyalar yüklenemedi.'))))
        );
    }

    /** Tek dosya yükler; ilerleme ve sonuç olayları. Hata Türkçe `Error`. */
    upload(ownerPath: string, file: File): Observable<StoredFileUploadEvent> {
        const form = new FormData();

        form.append('file', file, file.name);

        return this.api.upload<StoredFileDto>(ApiEndpoints.storedFiles.upload(ownerPath), form).pipe(
            filter((e) => e.type === HttpEventType.UploadProgress || e.type === HttpEventType.Response),
            map((e): StoredFileUploadEvent => {
                if (e.type === HttpEventType.UploadProgress) {
                    return { type: 'progress', percent: e.total ? Math.min(99, Math.round((e.loaded / e.total) * 100)) : 0 };
                }

                return { type: 'done', file: mapStoredFileDtoToVm((e as { body: StoredFileDto }).body) };
            }),
            catchError((err: unknown) =>
                throwError(() =>
                    err instanceof HttpErrorResponse ? new Error(fileErrorMessage(err, 'Dosya yüklenemedi.')) : err instanceof Error ? err : new Error('Dosya yüklenemedi.')
                )
            )
        );
    }

    /** `<img src>` için mutlak imzalı URL (varsayılan 5 dk). */
    accessUrl(ownerPath: string, fileId: string): Observable<string> {
        return this.api.post<StoredFileAccessUrlDto>(ApiEndpoints.storedFiles.accessUrl(ownerPath, fileId), {}).pipe(
            map((r) => this.api.absoluteUrl(r.url)),
            catchError((err: HttpErrorResponse) => throwError(() => new Error(fileErrorMessage(err, 'Görüntü açılamadı.'))))
        );
    }

    /** Bearer ile içerik (PDF açma / indirme). */
    content(ownerPath: string, fileId: string, download: boolean): Observable<{ blob: Blob; fileName: string | null }> {
        const path = ApiEndpoints.storedFiles.content(ownerPath, fileId) + (download ? '?download=true' : '');

        return this.api.getBlob(path).pipe(
            map((res) => ({
                blob: res.body ?? new Blob(),
                fileName: fileNameFromContentDisposition(res.headers.get('Content-Disposition'))
            })),
            catchError((err: HttpErrorResponse) => throwError(() => new Error(fileErrorMessage(err, 'Dosya açılamadı.'))))
        );
    }
}

function fileErrorMessage(err: HttpErrorResponse, fallback: string): string {
    return storedFileProblemMessage(problemCodeFromHttpError(err)) ?? (err.status === 413 ? storedFileProblemMessage('Files.TooLarge')! : messageFromHttpError(err, fallback));
}
