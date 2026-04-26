import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable, of, switchMap, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { mapDashboardFinanceSummaryDtoToVm } from '@/app/features/dashboard/data/dashboard-finance.mapper';
import {
    buildDashboardAlerts,
    buildOperationalActionItems,
    mapDashboardCapabilitiesDtoToVm,
    mapDashboardOperationalAlertsDtoToVm,
    normalizeDashboardSummaryDto,
    pickUpcomingVaccinations,
    sortAppointmentsByScheduledAsc
} from '@/app/features/dashboard/data/dashboard-operational.mapper';
import type {
    DashboardOperationalVm,
    DashboardSection,
    DashboardSummaryNormalized
} from '@/app/features/dashboard/models/dashboard-operational.model';
import type { DashboardCapabilitiesDto, DashboardCapabilitiesVm } from '@/app/features/dashboard/models/dashboard-capabilities.model';
import type { DashboardFinanceSummaryDto, DashboardFinanceSummaryVm } from '@/app/features/dashboard/models/dashboard-finance.model';
import type {
    DashboardActionItemVm,
    DashboardOperationalAlertsDto,
    DashboardOperationalAlertsVm
} from '@/app/features/dashboard/models/dashboard-operational-alerts.model';
import type { DashboardSummaryDto } from '@/app/features/dashboard/models/dashboard-summary.model';
import { AppointmentsService } from '@/app/features/appointments/services/appointments.service';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import { VaccinationsService } from '@/app/features/vaccinations/services/vaccinations.service';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { localDateYyyyMmDd } from '@/app/shared/utils/date.utils';
import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import type { ExaminationListItemVm } from '@/app/features/examinations/models/examination-vm.model';
import type { VaccinationListItemVm } from '@/app/features/vaccinations/models/vaccination-vm.model';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';

/** Faz 1: dashboard summary + finance (+ paylaşımlı tenant subscription-summary). */
export interface DashboardSummariesPhaseResult {
    readonly summary: DashboardSection<DashboardSummaryNormalized | null>;
    readonly capabilities: DashboardSection<DashboardCapabilitiesVm>;
    readonly operationalAlerts: DashboardSection<DashboardOperationalAlertsVm>;
    readonly actionItems: DashboardActionItemVm[];
    readonly alerts: DashboardActionItemVm[];
    readonly canViewFinance: boolean;
    readonly canViewOperationalAlerts: boolean;
    readonly finance: DashboardSection<DashboardFinanceSummaryVm | null>;
}

interface DashboardListsPhaseResult {
    readonly todayAppointments: DashboardSection<AppointmentListItemVm[]>;
    readonly vaccinationItems: DashboardSection<VaccinationListItemVm[]>;
    readonly examinationItems: DashboardSection<ExaminationListItemVm[]>;
}

export function dashboardVmWithPendingLists(summaries: DashboardSummariesPhaseResult): DashboardOperationalVm {
    const pending: DashboardListsPhaseResult = {
        todayAppointments: { data: [], error: null },
        vaccinationItems: { data: [], error: null },
        examinationItems: { data: [], error: null }
    };
    return mergeDashboardListPhaseIntoVm(summaries, pending);
}

export function mergeDashboardListPhaseIntoVm(
    summaries: DashboardSummariesPhaseResult,
    lists: DashboardListsPhaseResult
): DashboardOperationalVm {
    return {
        summary: summaries.summary,
        capabilities: summaries.capabilities,
        operationalAlerts: summaries.operationalAlerts,
        actionItems: summaries.actionItems,
        alerts: summaries.alerts,
        canViewFinance: summaries.canViewFinance,
        canViewOperationalAlerts: summaries.canViewOperationalAlerts,
        finance: summaries.finance,
        todayAppointments: {
            data: sortAppointmentsByScheduledAsc(lists.todayAppointments.data),
            error: lists.todayAppointments.error
        },
        upcomingVaccinations: {
            data: pickUpcomingVaccinations(lists.vaccinationItems.data, 8),
            error: lists.vaccinationItems.error
        },
        recentExaminations: {
            data: lists.examinationItems.data.slice(0, 6),
            error: lists.examinationItems.error
        }
    };
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
    private readonly api = inject(ApiClient);
    private readonly appointments = inject(AppointmentsService);
    private readonly vaccinations = inject(VaccinationsService);
    private readonly examinations = inject(ExaminationsService);
    private readonly tenantReadOnlyContext = inject(TenantReadOnlyContextService);

    getSummary(): Observable<DashboardSummaryDto> {
        return this.api.get<DashboardSummaryDto>(ApiEndpoints.dashboard.summary()).pipe(
            catchError((err: HttpErrorResponse) => throwError(() => new Error(messageFromHttpError(err, 'Özet yüklenemedi.'))))
        );
    }

    getCapabilities(): Observable<DashboardCapabilitiesDto> {
        return this.api.get<DashboardCapabilitiesDto>(ApiEndpoints.dashboard.capabilities()).pipe(
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Dashboard yetki bilgisi yüklenemedi.')))
            )
        );
    }

    getOperationalAlerts(): Observable<DashboardOperationalAlertsDto> {
        return this.api.get<DashboardOperationalAlertsDto>(ApiEndpoints.dashboard.operationalAlerts()).pipe(
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Operasyon uyarıları yüklenemedi.')))
            )
        );
    }

    /**
     * Faz 1 — summary/capabilities/alerts/subscription paralel;
     * finance-summary yalnız `canViewFinance` true ise çağrılır.
     */
    loadDashboardSummariesPhase(): Observable<DashboardSummariesPhaseResult> {
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

        const section = <T,>(source: Observable<T>, fallback: T, errMsg: string): Observable<DashboardSection<T>> =>
            source.pipe(
                map((data): DashboardSection<T> => ({ data, error: null })),
                catchError((): Observable<DashboardSection<T>> => of({ data: fallback, error: errMsg }))
            );

        const fallbackCapabilities = mapDashboardCapabilitiesDtoToVm(null);
        const fallbackOperationalAlerts = mapDashboardOperationalAlertsDtoToVm(null);
        const fallbackFinance: DashboardSection<DashboardFinanceSummaryVm | null> = { data: null, error: null };

        const financeSection$ = (): Observable<DashboardSection<DashboardFinanceSummaryVm | null>> =>
            section(
                this.api
                    .get<DashboardFinanceSummaryDto>(ApiEndpoints.dashboard.financeSummary())
                    .pipe(map(mapDashboardFinanceSummaryDtoToVm)),
                null,
                'Finans özeti yüklenemedi.'
            );

        return forkJoin({
            summary: summary$,
            capabilities: section(
                this.getCapabilities().pipe(map(mapDashboardCapabilitiesDtoToVm)),
                fallbackCapabilities,
                'Dashboard yetki bilgisi yüklenemedi.'
            ),
            operationalAlerts: section(
                this.getOperationalAlerts().pipe(map(mapDashboardOperationalAlertsDtoToVm)),
                fallbackOperationalAlerts,
                'Operasyon uyarıları yüklenemedi.'
            ),
            subscription: this.tenantReadOnlyContext.ensurePanelSubscriptionSummary()
        }).pipe(
            switchMap(({ summary, capabilities, operationalAlerts }) => {
                const canViewFinance = capabilities.data.canViewFinance;
                return (canViewFinance ? financeSection$() : of(fallbackFinance)).pipe(
                    map((finance) => {
                        const alerts = buildDashboardAlerts(capabilities.data);
                        const actionItems = capabilities.data.canViewOperationalAlerts
                            ? buildOperationalActionItems(operationalAlerts.data)
                            : [];
                        return {
                            summary,
                            capabilities,
                            operationalAlerts,
                            actionItems,
                            alerts,
                            canViewFinance,
                            canViewOperationalAlerts: capabilities.data.canViewOperationalAlerts,
                            finance
                        };
                    })
                );
            })
        );
    }

    /**
     * Faz 2 — en fazla 3 paralel: bugünkü randevular, aşı listesi (sonra süzülür), son muayeneler.
     */
    loadDashboardListsPhase(): Observable<DashboardListsPhaseResult> {
        const today = localDateYyyyMmDd();

        const section = <T,>(source: Observable<T>, fallback: T, errMsg: string): Observable<DashboardSection<T>> =>
            source.pipe(
                map((data): DashboardSection<T> => ({ data, error: null })),
                catchError((): Observable<DashboardSection<T>> => of({ data: fallback, error: errMsg }))
            );

        return forkJoin({
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
            )
        });
    }

    /**
     * Tek abonelik: faz 1 → faz 2 (test / basit yenileme).
     */
    loadOperationalDashboard(): Observable<DashboardOperationalVm> {
        return this.loadDashboardSummariesPhase().pipe(
            switchMap((summaries) =>
                this.loadDashboardListsPhase().pipe(map((lists) => mergeDashboardListPhaseIntoVm(summaries, lists)))
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
