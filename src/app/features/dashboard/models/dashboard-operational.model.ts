import type { DashboardSummaryDto } from '@/app/features/dashboard/models/dashboard-summary.model';
import type { DashboardTrendDayVm } from '@/app/features/dashboard/models/dashboard-trend.model';
import type { DashboardFinanceSummaryVm } from '@/app/features/dashboard/models/dashboard-finance.model';
import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import type { ExaminationListItemVm } from '@/app/features/examinations/models/examination-vm.model';
import type { VaccinationListItemVm } from '@/app/features/vaccinations/models/vaccination-vm.model';

/**
 * Tek servis çağrısı sonucu; blok bazlı hata ile dashboard tamamen çökmez.
 */
export interface DashboardSection<T> {
    data: T;
    error: string | null;
}

export interface DashboardSummaryNormalized extends DashboardSummaryDto {
    upcomingAppointments: NonNullable<DashboardSummaryDto['upcomingAppointments']>;
    recentClients: NonNullable<DashboardSummaryDto['recentClients']>;
    recentPets: NonNullable<DashboardSummaryDto['recentPets']>;
    /** Son 7 gün günlük randevu sayısı (mapper; backend alanı toleranslı). */
    last7DaysAppointmentsTrend: readonly DashboardTrendDayVm[];
}

/** Dashboard sayfası — tek snapshot (forkJoin sonucu). */
export interface DashboardOperationalVm {
    summary: DashboardSection<DashboardSummaryNormalized | null>;
    todayAppointments: DashboardSection<AppointmentListItemVm[]>;
    upcomingVaccinations: DashboardSection<VaccinationListItemVm[]>;
    recentExaminations: DashboardSection<ExaminationListItemVm[]>;
    /** GET /dashboard/finance-summary — Finance+ tutarlar ve son ödemeler. */
    finance: DashboardSection<DashboardFinanceSummaryVm | null>;
}
