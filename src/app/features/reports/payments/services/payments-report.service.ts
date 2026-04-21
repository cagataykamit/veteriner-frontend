import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import { mapPaymentsReportDtoToVm } from '@/app/features/reports/payments/data/payments-report.mapper';
import type { PaymentsReportDto } from '@/app/features/reports/payments/models/payments-report-api.model';
import { paymentsReportQueryToHttpParams, type PaymentsReportQuery } from '@/app/features/reports/payments/models/payments-report-query.model';
import type { PaymentsReportResultVm } from '@/app/features/reports/payments/models/payments-report.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class PaymentsReportService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    /**
     * GET `/api/v1/reports/payments`
     */
    loadReport(query: PaymentsReportQuery): Observable<PaymentsReportResultVm> {
        const merged = this.mergeClinicContext(query);
        const params = paymentsReportQueryToHttpParams(merged);
        const page = merged.page ?? 1;
        const pageSize = merged.pageSize ?? 25;
        return this.api.get<PaymentsReportDto>(ApiEndpoints.reports.payments(), params).pipe(
            map((raw) => mapPaymentsReportDtoToVm(raw, { page, pageSize })),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Ödeme raporu yüklenemedi.')))
            )
        );
    }

    /**
     * GET `/api/v1/reports/payments/export` — aynı filtreler, sayfalama yok.
     */
    exportCsvBlob(query: PaymentsReportQuery) {
        const merged = this.mergeClinicContext(query);
        const params = paymentsReportQueryToHttpParams(merged, { omitPaging: true });
        return this.api.getBlob(ApiEndpoints.reports.paymentsExport(), params).pipe(
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'CSV dışa aktarma başarısız.')))
            )
        );
    }

    /** GET `/api/v1/reports/payments/export-xlsx` — aynı filtreler, sayfalama yok. */
    exportXlsxBlob(query: PaymentsReportQuery) {
        const merged = this.mergeClinicContext(query);
        const params = paymentsReportQueryToHttpParams(merged, { omitPaging: true });
        return this.api.getBlob(ApiEndpoints.reports.paymentsExportXlsx(), params).pipe(
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Excel dışa aktarma başarısız.')))
            )
        );
    }

    private mergeClinicContext(query: PaymentsReportQuery): PaymentsReportQuery {
        const clinicFromAuth = this.auth.getClinicId()?.trim() ?? '';
        return {
            ...query,
            clinicId: query.clinicId?.trim() ? query.clinicId.trim() : clinicFromAuth || undefined
        };
    }
}
