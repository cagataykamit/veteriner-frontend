import { HttpParams } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import type { RegisterDto, RegisterResultVm } from '@/app/features/reports/registers/models/register.model';
import type { ReportListQueryBase, ReportListSource } from '@/app/features/reports/shared/report-list-state';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { userErrorFromHttp } from '@/app/shared/utils/api-error.utils';

/** Liste ve dışa aktarma aynı süzgeç kümesini (`from`, `to`, `clinicId`) gönderir; sayfalama yalnız listede. */
export function registerQueryToHttpParams(query: ReportListQueryBase, opts?: { omitPaging?: boolean }): HttpParams {
    let p = new HttpParams();

    if (!opts?.omitPaging) {
        p = p.set('page', String(query.page ?? 1)).set('pageSize', String(query.pageSize ?? 25));
    }

    if (query.from?.trim()) {
        p = p.set('from', query.from.trim());
    }

    if (query.to?.trim()) {
        p = p.set('to', query.to.trim());
    }

    if (query.clinicId?.trim()) {
        p = p.set('clinicId', query.clinicId.trim());
    }

    for (const key of ['includeVoided', 'productId', 'veterinarianId', 'hbsStatus'] as const) {
        if (query[key]?.trim()) {
            p = p.set(key, query[key].trim());
        }
    }

    return p;
}

/** Bir kayıt defterinin (`examinations`, `prescriptions`…) liste ve dışa aktarma uçları. */
export class RegisterReportSource<T> implements ReportListSource<ReportListQueryBase, RegisterResultVm<T>> {
    private readonly path: string;

    constructor(
        private readonly api: ApiClient,
        private readonly auth: AuthService,
        book: string
    ) {
        this.path = ApiEndpoints.reports.register(book);
    }

    loadReport(query: ReportListQueryBase): Observable<RegisterResultVm<T>> {
        const merged = this.mergeClinicContext(query);
        const page = merged.page ?? 1;
        const pageSize = merged.pageSize ?? 25;

        return this.api.get<RegisterDto<T>>(this.path, registerQueryToHttpParams(merged)).pipe(map((raw) => ({ ...raw, page, pageSize })));
    }

    exportCsvBlob(query: ReportListQueryBase) {
        return this.exportBlob(`${this.path}/export`, query);
    }

    exportXlsxBlob(query: ReportListQueryBase) {
        return this.exportBlob(`${this.path}/export-xlsx`, query);
    }

    private exportBlob(path: string, query: ReportListQueryBase) {
        const params = registerQueryToHttpParams(this.mergeClinicContext(query), { omitPaging: true });

        return this.api.getBlob(path, params).pipe(
            catchError((err) => throwError(() => userErrorFromHttp(err, PANEL_COPY.reportsExportFailedFallback)))
        );
    }

    private mergeClinicContext(query: ReportListQueryBase): ReportListQueryBase {
        const clinicFromAuth = this.auth.getClinicId()?.trim() ?? '';

        return { ...query, clinicId: query.clinicId?.trim() ? query.clinicId.trim() : clinicFromAuth || undefined };
    }
}
