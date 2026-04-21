import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import { mapAppointmentsReportDtoToVm } from '@/app/features/reports/appointments/data/appointments-report.mapper';
import type { AppointmentsReportDto } from '@/app/features/reports/appointments/models/appointments-report-api.model';
import {
    appointmentsReportQueryToHttpParams,
    type AppointmentsReportQuery
} from '@/app/features/reports/appointments/models/appointments-report-query.model';
import type { AppointmentsReportResultVm } from '@/app/features/reports/appointments/models/appointments-report.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class AppointmentsReportService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    /** GET `/api/v1/reports/appointments` */
    loadReport(query: AppointmentsReportQuery): Observable<AppointmentsReportResultVm> {
        const merged = this.mergeClinicContext(query);
        const params = appointmentsReportQueryToHttpParams(merged);
        const page = merged.page ?? 1;
        const pageSize = merged.pageSize ?? 25;
        return this.api.get<AppointmentsReportDto>(ApiEndpoints.reports.appointments(), params).pipe(
            map((raw) => mapAppointmentsReportDtoToVm(raw, { page, pageSize })),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Randevu raporu yüklenemedi.')))
            )
        );
    }

    /** GET `/api/v1/reports/appointments/export` — aynı filtreler, sayfalama yok. */
    exportCsvBlob(query: AppointmentsReportQuery) {
        const merged = this.mergeClinicContext(query);
        const params = appointmentsReportQueryToHttpParams(merged, { omitPaging: true });
        return this.api.getBlob(ApiEndpoints.reports.appointmentsExport(), params).pipe(
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'CSV dışa aktarma başarısız.')))
            )
        );
    }

    /** GET `/api/v1/reports/appointments/export-xlsx` — aynı filtreler, sayfalama yok. */
    exportXlsxBlob(query: AppointmentsReportQuery) {
        const merged = this.mergeClinicContext(query);
        const params = appointmentsReportQueryToHttpParams(merged, { omitPaging: true });
        return this.api.getBlob(ApiEndpoints.reports.appointmentsExportXlsx(), params).pipe(
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Excel dışa aktarma başarısız.')))
            )
        );
    }

    private mergeClinicContext(query: AppointmentsReportQuery): AppointmentsReportQuery {
        const clinicFromAuth = this.auth.getClinicId()?.trim() ?? '';
        return {
            ...query,
            clinicId: query.clinicId?.trim() ? query.clinicId.trim() : clinicFromAuth || undefined
        };
    }
}
