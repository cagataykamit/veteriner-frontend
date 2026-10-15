import { HttpResponse } from '@angular/common/http';
import { fileNameFromContentDisposition, triggerBlobDownload } from '@/app/shared/utils/file-download.utils';

/** Sunucunun verdiği dosya adıyla (yoksa `fallbackName`) tarayıcı indirmesini başlatır. */
export function saveDownload(res: HttpResponse<Blob>, fallbackName: string): void {
    if (!res.body) {
        return;
    }

    triggerBlobDownload(res.body, fileNameFromContentDisposition(res.headers.get('Content-Disposition')) ?? fallbackName);
}
