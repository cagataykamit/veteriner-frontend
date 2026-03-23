import type { DashboardSummaryDto } from '@/app/features/dashboard/models/dashboard-summary.model';
import type { DashboardSummaryNormalized } from '@/app/features/dashboard/models/dashboard-operational.model';
import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import type { PaymentListItemVm } from '@/app/features/payments/models/payment-vm.model';
import type { VaccinationListItemVm } from '@/app/features/vaccinations/models/vaccination-vm.model';
import { normalizePaymentStatusKey } from '@/app/features/payments/utils/payment-status.utils';

const ATTENTION_PAYMENT_KEYS = new Set(['pending', 'overdue', 'scheduled', 'partial']);

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
            if (!v.nextDueAtUtc?.trim()) {
                return false;
            }
            const t = new Date(v.nextDueAtUtc).getTime();
            if (Number.isNaN(t)) {
                return false;
            }
            return t <= now + horizonMs;
        })
        .sort((a, b) => new Date(a.nextDueAtUtc!).getTime() - new Date(b.nextDueAtUtc!).getTime())
        .slice(0, max);
}

/** Ödeme: bekleyen / vadesi geçmiş / planlı / kısmi — operasyonel öncelik. */
/** Bugünkü randevu listesi — saate göre artan. */
export function sortAppointmentsByScheduledAsc(items: AppointmentListItemVm[]): AppointmentListItemVm[] {
    return [...items].sort((a, b) => {
        const ta = a.scheduledAtUtc ? new Date(a.scheduledAtUtc).getTime() : 0;
        const tb = b.scheduledAtUtc ? new Date(b.scheduledAtUtc).getTime() : 0;
        return ta - tb;
    });
}

export function pickAttentionPayments(items: PaymentListItemVm[], max: number): PaymentListItemVm[] {
    const picked = items.filter((p) => {
        const k = normalizePaymentStatusKey(p.status ?? '');
        return ATTENTION_PAYMENT_KEYS.has(k);
    });
    return picked
        .sort((a, b) => {
            const da = a.dueDateUtc ? new Date(a.dueDateUtc).getTime() : Number.MAX_SAFE_INTEGER;
            const db = b.dueDateUtc ? new Date(b.dueDateUtc).getTime() : Number.MAX_SAFE_INTEGER;
            if (da !== db) {
                return da - db;
            }
            const ca = a.createdAtUtc ? new Date(a.createdAtUtc).getTime() : 0;
            const cb = b.createdAtUtc ? new Date(b.createdAtUtc).getTime() : 0;
            return cb - ca;
        })
        .slice(0, max);
}
