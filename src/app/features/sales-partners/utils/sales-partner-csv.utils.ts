import type { HttpResponse } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { fileNameFromContentDisposition, triggerBlobDownload } from '@/app/shared/utils/file-download.utils';

export const SALES_PARTNER_CSV_FALLBACK_NAME = 'vetinity-satis-ortagi-komisyon.csv';

/** Komisyon CSV'sini indirir (dosya adı sunucudan, yoksa varsayılan). */
export function downloadSalesPartnerCsv(
    request: Observable<HttpResponse<Blob>>,
    handlers: { done: () => void; failed: (message: string) => void }
): void {
    request.subscribe({
        next: (res) => {
            if (res.body) {
                triggerBlobDownload(res.body, fileNameFromContentDisposition(res.headers.get('Content-Disposition')) ?? SALES_PARTNER_CSV_FALLBACK_NAME);
            }

            handlers.done();
        },
        error: (e: unknown) => handlers.failed(e instanceof Error ? e.message : 'CSV indirilemedi.')
    });
}
