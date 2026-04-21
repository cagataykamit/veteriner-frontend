import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import { mapExaminationsReportDtoToVm } from '@/app/features/reports/examinations/data/examinations-report.mapper';
import type { ExaminationsReportDto } from '@/app/features/reports/examinations/models/examinations-report-api.model';
import {
    examinationsReportQueryToHttpParams,
    type ExaminationsReportQuery
} from '@/app/features/reports/examinations/models/examinations-report-query.model';
import type { ExaminationsReportResultVm } from '@/app/features/reports/examinations/models/examinations-report.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class ExaminationsReportService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    /** GET `/api/v1/reports/examinations` */
    loadReport(query: ExaminationsReportQuery): Observable<ExaminationsReportResultVm> {
        const merged = this.mergeClinicContext(query);
        const params = examinationsReportQueryToHttpParams(merged);
        const page = merged.page ?? 1;
        const pageSize = merged.pageSize ?? 25;
        return this.api.get<ExaminationsReportDto>(ApiEndpoints.reports.examinations(), params).pipe(
            map((raw) => mapExaminationsReportDtoToVm(raw, { page, pageSize })),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Muayene raporu yüklenemedi.')))
            )
        );
    }

    /** GET `/api/v1/reports/examinations/export` — aynı filtreler, sayfalama yok. */
    exportCsvBlob(query: ExaminationsReportQuery) {
        const merged = this.mergeClinicContext(query);
        const params = examinationsReportQueryToHttpParams(merged, { omitPaging: true });
        return this.api.getBlob(ApiEndpoints.reports.examinationsExport(), params).pipe(
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'CSV dışa aktarma başarısız.')))
            )
        );
    }

    /** GET `/api/v1/reports/examinations/export-xlsx` — aynı filtreler, sayfalama yok. */
    exportXlsxBlob(query: ExaminationsReportQuery) {
        const merged = this.mergeClinicContext(query);
        const params = examinationsReportQueryToHttpParams(merged, { omitPaging: true });
        return this.api.getBlob(ApiEndpoints.reports.examinationsExportXlsx(), params).pipe(
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Excel dışa aktarma başarısız.')))
            )
        );
    }

    private mergeClinicContext(query: ExaminationsReportQuery): ExaminationsReportQuery {
        const clinicFromAuth = this.auth.getClinicId()?.trim() ?? '';
        return {
            ...query,
            clinicId: query.clinicId?.trim() ? query.clinicId.trim() : clinicFromAuth || undefined
        };
    }
}
