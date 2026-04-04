import type { DashboardSummaryDto } from '@/app/features/dashboard/models/dashboard-summary.model';
import type { DashboardSummaryNormalized } from '@/app/features/dashboard/models/dashboard-operational.model';
import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import type { VaccinationListItemVm } from '@/app/features/vaccinations/models/vaccination-vm.model';

/**
 * Summary DTO’da liste alanları null olabilir — tabloya güvenli varsayılan.
 */
export function normalizeDashboardSummaryDto(raw: DashboardSummaryDto): DashboardSummaryNormalized {
    return {
        ...raw,
        todayAppointmentsCount: raw.todayAppointmentsCount ?? 0,
        upcomingAppointmentsCount: raw.upcomingAppointmentsCount ?? 0,
        completedTodayCount: raw.completedTodayCount ?? 0,
        cancelledTodayCount: raw.cancelledTodayCount ?? 0,
        totalClientsCount: raw.totalClientsCount ?? 0,
        totalPetsCount: raw.totalPetsCount ?? 0,
        upcomingAppointments: raw.upcomingAppointments ?? [],
        recentClients: raw.recentClients ?? [],
        recentPets: raw.recentPets ?? []
    };
}

/**
 * Yaklaşan / gecikmiş aşılar: nextDue öncelikli, en fazla `max` kayıt.
 * Backend sıralaması yoksa bile istemci tarafında sıralanır.
 */
export function pickUpcomingVaccinations(
    items: VaccinationListItemVm[],
    max: number,
    horizonDays = 90
): VaccinationListItemVm[] {
    const horizonMs = horizonDays * 86400000;
    const now = Date.now();
    return [...items]
        .filter((v) => {
            if (!v.dueAtUtc?.trim()) {
                return false;
            }
            const t = new Date(v.dueAtUtc).getTime();
            if (Number.isNaN(t)) {
                return false;
            }
            return t <= now + horizonMs;
        })
        .sort((a, b) => new Date(a.dueAtUtc!).getTime() - new Date(b.dueAtUtc!).getTime())
        .slice(0, max);
}

/** Bugünkü randevu listesi — saate göre artan. */
export function sortAppointmentsByScheduledAsc(items: AppointmentListItemVm[]): AppointmentListItemVm[] {
    return [...items].sort((a, b) => {
        const ta = a.scheduledAtUtc ? new Date(a.scheduledAtUtc).getTime() : 0;
        const tb = b.scheduledAtUtc ? new Date(b.scheduledAtUtc).getTime() : 0;
        return ta - tb;
    });
}
