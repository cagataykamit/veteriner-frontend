import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { mapDashboardFinanceSummaryDtoToVm } from '@/app/features/dashboard/data/dashboard-finance.mapper';
import {
    normalizeDashboardSummaryDto,
    pickUpcomingVaccinations,
    sortAppointmentsByScheduledAsc
} from '@/app/features/dashboard/data/dashboard-operational.mapper';
import type {
    DashboardOperationalVm,
    DashboardSection,
    DashboardSummaryNormalized
} from '@/app/features/dashboard/models/dashboard-operational.model';
import type { DashboardFinanceSummaryDto } from '@/app/features/dashboard/models/dashboard-finance.model';
import type { DashboardSummaryDto } from '@/app/features/dashboard/models/dashboard-summary.model';
import { AppointmentsService } from '@/app/features/appointments/services/appointments.service';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import { VaccinationsService } from '@/app/features/vaccinations/services/vaccinations.service';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { localDateYyyyMmDd } from '@/app/shared/utils/date.utils';
import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
    private readonly api = inject(ApiClient);
    private readonly appointments = inject(AppointmentsService);
    private readonly vaccinations = inject(VaccinationsService);
    private readonly examinations = inject(ExaminationsService);

    getSummary(): Observable<DashboardSummaryDto> {
        return this.api.get<DashboardSummaryDto>(ApiEndpoints.dashboard.summary()).pipe(
            catchError((err: HttpErrorResponse) => throwError(() => new Error(messageFromHttpError(err, 'Özet yüklenemedi.'))))
        );
    }

    /**
     * Tek turda özet + operasyon listeleri (paralel forkJoin).
     * Blok bazlı hata: bir uç kırılsa bile diğer bölümler dolar.
     */
    loadOperationalDashboard(): Observable<DashboardOperationalVm> {
        const today = localDateYyyyMmDd();

        const section = <T,>(source: Observable<T>, fallback: T, errMsg: string): Observable<DashboardSection<T>> =>
            source.pipe(
                map((data): DashboardSection<T> => ({ data, error: null })),
                catchError((): Observable<DashboardSection<T>> => of({ data: fallback, error: errMsg }))
            );

        const summary$: Observable<DashboardSection<DashboardSummaryNormalized | null>> = this.getSummary().pipe(
            map(
                (dto): DashboardSection<DashboardSummaryNormalized | null> => ({
                    data: normalizeDashboardSummaryDto(dto),
                    error: null
                })
            ),
            catchError((e: Error): Observable<DashboardSection<DashboardSummaryNormalized | null>> =>
                of({ data: null, error: e.message ?? 'Özet yüklenemedi.' })
            )
        );

        return forkJoin({
            summary: summary$,
            todayAppointments: section(
                this.appointments
                    .getAppointments({ page: 1, pageSize: 40, fromDate: today, toDate: today })
                    .pipe(map((r) => r.items.filter((x) => isSameLocalDay(x, today)))),
                [],
                'Bugünkü randevular yüklenemedi.'
            ),
            vaccinationItems: section(
                this.vaccinations
                    .getVaccinations({
                        page: 1,
                        pageSize: 60,
                        sort: 'NextDueAtUtc',
                        order: 'asc'
                    })
                    .pipe(map((r) => r.items)),
                [],
                'Aşı listesi yüklenemedi.'
            ),
            examinationItems: section(
                this.examinations
                    .getExaminations({
                        page: 1,
                        pageSize: 8,
                        sort: 'ExaminationDateUtc',
                        order: 'desc'
                    })
                    .pipe(map((r) => r.items)),
                [],
                'Muayene listesi yüklenemedi.'
            ),
            finance: section(
                this.api
                    .get<DashboardFinanceSummaryDto>(ApiEndpoints.dashboard.financeSummary())
                    .pipe(map(mapDashboardFinanceSummaryDtoToVm)),
                null,
                'Finans özeti yüklenemedi.'
            )
        }).pipe(
            map(
                (x): DashboardOperationalVm => ({
                    summary: x.summary,
                    todayAppointments: {
                        data: sortAppointmentsByScheduledAsc(x.todayAppointments.data),
                        error: x.todayAppointments.error
                    },
                    upcomingVaccinations: {
                        data: pickUpcomingVaccinations(x.vaccinationItems.data, 8),
                        error: x.vaccinationItems.error
                    },
                    recentExaminations: {
                        data: x.examinationItems.data.slice(0, 6),
                        error: x.examinationItems.error
                    },
                    finance: x.finance
                })
            )
        );
    }
}

function isSameLocalDay(item: AppointmentListItemVm, yyyyMmDd: string): boolean {
    const v = item.scheduledAtUtc?.trim();
    if (!v) {
        return false;
    }
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
        return false;
    }
    return localDateYyyyMmDd(d) === yyyyMmDd;
}
