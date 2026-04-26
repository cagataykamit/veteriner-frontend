import type { DashboardSummaryDto } from '@/app/features/dashboard/models/dashboard-summary.model';
import type { DashboardSummaryNormalized } from '@/app/features/dashboard/models/dashboard-operational.model';
import type {
    DashboardCapabilitiesDto,
    DashboardCapabilitiesVm
} from '@/app/features/dashboard/models/dashboard-capabilities.model';
import type {
    DashboardActionItemVm,
    DashboardActionSeverity,
    DashboardOperationalAlertsDto,
    DashboardOperationalAlertsVm
} from '@/app/features/dashboard/models/dashboard-operational-alerts.model';
import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import type { VaccinationListItemVm } from '@/app/features/vaccinations/models/vaccination-vm.model';
import { buildSevenDayTrendPoints, parseLastSevenDayAppointmentCounts } from '@/app/features/dashboard/utils/dashboard-trend.utils';

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
        recentPets: raw.recentPets ?? [],
        last7DaysAppointmentsTrend: buildSevenDayTrendPoints(parseLastSevenDayAppointmentCounts(raw.last7DaysAppointments))
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

export function mapDashboardCapabilitiesDtoToVm(raw: DashboardCapabilitiesDto | null | undefined): DashboardCapabilitiesVm {
    return {
        canViewFinance: raw?.canViewFinance === true,
        canViewOperationalAlerts: raw?.canViewOperationalAlerts === true,
        isOwner: raw?.isOwner === true,
        isAdmin: raw?.isAdmin === true,
        isStaff: raw?.isStaff === true,
        selectedClinicId: raw?.selectedClinicId?.trim() ? raw.selectedClinicId.trim() : null,
        hasClinicContext: raw?.hasClinicContext !== false,
        isTenantReadOnly: raw?.isTenantReadOnly === true
    };
}

export function mapDashboardOperationalAlertsDtoToVm(
    raw: DashboardOperationalAlertsDto | null | undefined
): DashboardOperationalAlertsVm {
    return {
        overdueScheduledAppointmentsCount: Math.max(0, raw?.overdueScheduledAppointmentsCount ?? 0),
        upcomingAppointmentsNext24HoursCount: Math.max(0, raw?.upcomingAppointmentsNext24HoursCount ?? 0),
        todayCancelledAppointmentsCount: Math.max(0, raw?.todayCancelledAppointmentsCount ?? 0),
        overdueVaccinationsCount: Math.max(0, raw?.overdueVaccinationsCount ?? 0),
        upcomingVaccinationsNext7DaysCount: Math.max(0, raw?.upcomingVaccinationsNext7DaysCount ?? 0)
    };
}

function item(
    key: string,
    count: number,
    title: string,
    description: string,
    severity: DashboardActionSeverity,
    route: string | null
): DashboardActionItemVm | null {
    if (count <= 0) {
        return null;
    }
    return { key, title, description, severity, count, route };
}

function severityRank(severity: DashboardActionSeverity): number {
    if (severity === 'danger') {
        return 0;
    }
    if (severity === 'warning') {
        return 1;
    }
    return 2;
}

export function buildOperationalActionItems(alerts: DashboardOperationalAlertsVm): DashboardActionItemVm[] {
    const items = [
        item(
            'overdueAppointments',
            alerts.overdueScheduledAppointmentsCount,
            'Zamanı geçmiş randevular',
            'Planlanan zamanı geçmiş randevular kontrol edilmeli.',
            alerts.overdueScheduledAppointmentsCount >= 3 ? 'danger' : 'warning',
            '/panel/appointments'
        ),
        item(
            'upcoming24hAppointments',
            alerts.upcomingAppointmentsNext24HoursCount,
            'Önümüzdeki 24 saatte randevular',
            'Yaklaşan randevu yoğunluğunu kontrol edin.',
            'info',
            '/panel/appointments'
        ),
        item(
            'todayCancelledAppointments',
            alerts.todayCancelledAppointmentsCount,
            'Bugün iptal edilen randevular',
            'İptal edilen randevular günlük planı etkileyebilir.',
            'warning',
            '/panel/appointments'
        ),
        item(
            'overdueVaccinations',
            alerts.overdueVaccinationsCount,
            'Geciken aşı takipleri',
            'Zamanı geçmiş aşı takiplerini kontrol edin.',
            'danger',
            '/panel/vaccinations'
        ),
        item(
            'upcoming7dVaccinations',
            alerts.upcomingVaccinationsNext7DaysCount,
            'Yaklaşan aşılar',
            'Önümüzdeki 7 gün içinde zamanı gelen aşılar var.',
            'info',
            '/panel/vaccinations'
        )
    ].filter((x): x is DashboardActionItemVm => x != null);

    return items.sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || b.count - a.count);
}

export function buildDashboardAlerts(capabilities: DashboardCapabilitiesVm): DashboardActionItemVm[] {
    const items: DashboardActionItemVm[] = [];
    if (capabilities.isTenantReadOnly) {
        items.push({
            key: 'tenantReadOnly',
            title: 'Klinik hesabı salt okunur durumda',
            description: 'Bazı kayıt işlemleri abonelik veya hesap durumu nedeniyle kısıtlanmış olabilir.',
            severity: 'warning',
            count: 1,
            route: null
        });
    }
    return items;
}
