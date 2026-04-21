import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import { mapVaccinationsReportDtoToVm } from '@/app/features/reports/vaccinations/data/vaccinations-report.mapper';
import type { VaccinationsReportDto } from '@/app/features/reports/vaccinations/models/vaccinations-report-api.model';
import {
    vaccinationsReportQueryToHttpParams,
    type VaccinationsReportQuery
} from '@/app/features/reports/vaccinations/models/vaccinations-report-query.model';
import type { VaccinationsReportResultVm } from '@/app/features/reports/vaccinations/models/vaccinations-report.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class VaccinationsReportService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    /** GET `/api/v1/reports/vaccinations` */
    loadReport(query: VaccinationsReportQuery): Observable<VaccinationsReportResultVm> {
        const merged = this.mergeClinicContext(query);
        const params = vaccinationsReportQueryToHttpParams(merged);
        const page = merged.page ?? 1;
        const pageSize = merged.pageSize ?? 25;
        return this.api.get<VaccinationsReportDto>(ApiEndpoints.reports.vaccinations(), params).pipe(
            map((raw) => mapVaccinationsReportDtoToVm(raw, { page, pageSize })),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Aşı raporu yüklenemedi.')))
            )
        );
    }

    /** GET `/api/v1/reports/vaccinations/export` — aynı filtreler, sayfalama yok. */
    exportCsvBlob(query: VaccinationsReportQuery) {
        const merged = this.mergeClinicContext(query);
        const params = vaccinationsReportQueryToHttpParams(merged, { omitPaging: true });
        return this.api.getBlob(ApiEndpoints.reports.vaccinationsExport(), params).pipe(
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'CSV dışa aktarma başarısız.')))
            )
        );
    }

    /** GET `/api/v1/reports/vaccinations/export-xlsx` — aynı filtreler, sayfalama yok. */
    exportXlsxBlob(query: VaccinationsReportQuery) {
        const merged = this.mergeClinicContext(query);
        const params = vaccinationsReportQueryToHttpParams(merged, { omitPaging: true });
        return this.api.getBlob(ApiEndpoints.reports.vaccinationsExportXlsx(), params).pipe(
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Excel dışa aktarma başarısız.')))
            )
        );
    }

    private mergeClinicContext(query: VaccinationsReportQuery): VaccinationsReportQuery {
        const clinicFromAuth = this.auth.getClinicId()?.trim() ?? '';
        return {
            ...query,
            clinicId: query.clinicId?.trim() ? query.clinicId.trim() : clinicFromAuth || undefined
        };
    }
}
