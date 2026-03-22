import type { DashboardSummaryDto } from '@/app/features/dashboard/models/dashboard-summary.model';
import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import type { ExaminationListItemVm } from '@/app/features/examinations/models/examination-vm.model';
import type { PaymentListItemVm } from '@/app/features/payments/models/payment-vm.model';
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
}

/** Dashboard sayfası — tek snapshot (forkJoin sonucu). */
export interface DashboardOperationalVm {
    summary: DashboardSection<DashboardSummaryNormalized | null>;
    todayAppointments: DashboardSection<AppointmentListItemVm[]>;
    upcomingVaccinations: DashboardSection<VaccinationListItemVm[]>;
    recentExaminations: DashboardSection<ExaminationListItemVm[]>;
    attentionPayments: DashboardSection<PaymentListItemVm[]>;
}
