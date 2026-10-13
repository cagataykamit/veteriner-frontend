import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import { mapOutstandingBalancesReportDtoToVm } from '@/app/features/reports/outstanding-balances/data/outstanding-balances-report.mapper';
import type { OutstandingBalancesReportDto } from '@/app/features/reports/outstanding-balances/models/outstanding-balances-report-api.model';
import {
    outstandingBalancesReportQueryToHttpParams,
    type OutstandingBalancesReportQuery
} from '@/app/features/reports/outstanding-balances/models/outstanding-balances-report-query.model';
import type { OutstandingBalancesReportResultVm } from '@/app/features/reports/outstanding-balances/models/outstanding-balances-report.model';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class OutstandingBalancesReportService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    /** GET `/api/v1/reports/outstanding-balances` */
    loadReport(query: OutstandingBalancesReportQuery): Observable<OutstandingBalancesReportResultVm> {
        const merged = this.mergeClinicContext(query);
        const params = outstandingBalancesReportQueryToHttpParams(merged);
        const page = merged.page ?? 1;
        const pageSize = merged.pageSize ?? 25;
        return this.api
            .get<OutstandingBalancesReportDto>(ApiEndpoints.reports.outstandingBalances(), params)
            .pipe(map((raw) => mapOutstandingBalancesReportDtoToVm(raw, { page, pageSize })));
    }

    /** GET `/api/v1/reports/outstanding-balances/export` — aynı filtreler, sayfalama yok. */
    exportCsvBlob(query: OutstandingBalancesReportQuery) {
        const params = outstandingBalancesReportQueryToHttpParams(this.mergeClinicContext(query), { omitPaging: true });
        return this.api.getBlob(ApiEndpoints.reports.outstandingBalancesExport(), params).pipe(
            catchError((err) => throwError(() => new Error(messageFromHttpError(err, PANEL_COPY.reportsExportFailedFallback))))
        );
    }

    /** GET `/api/v1/reports/outstanding-balances/export-xlsx` — aynı filtreler, sayfalama yok. */
    exportXlsxBlob(query: OutstandingBalancesReportQuery) {
        const params = outstandingBalancesReportQueryToHttpParams(this.mergeClinicContext(query), { omitPaging: true });
        return this.api.getBlob(ApiEndpoints.reports.outstandingBalancesExportXlsx(), params).pipe(
            catchError((err) => throwError(() => new Error(messageFromHttpError(err, PANEL_COPY.reportsExportFailedFallback))))
        );
    }

    private mergeClinicContext(query: OutstandingBalancesReportQuery): OutstandingBalancesReportQuery {
        const clinicFromAuth = this.auth.getClinicId()?.trim() ?? '';
        return { ...query, clinicId: query.clinicId?.trim() ? query.clinicId.trim() : clinicFromAuth || undefined };
    }
}
