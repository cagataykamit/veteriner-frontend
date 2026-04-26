/**
 * GET /api/v1/dashboard/operational-alerts
 */
export interface DashboardOperationalAlertsDto {
    overdueScheduledAppointmentsCount?: number | null;
    upcomingAppointmentsNext24HoursCount?: number | null;
    todayCancelledAppointmentsCount?: number | null;
    overdueVaccinationsCount?: number | null;
    upcomingVaccinationsNext7DaysCount?: number | null;
}

export interface DashboardOperationalAlertsVm {
    overdueScheduledAppointmentsCount: number;
    upcomingAppointmentsNext24HoursCount: number;
    todayCancelledAppointmentsCount: number;
    overdueVaccinationsCount: number;
    upcomingVaccinationsNext7DaysCount: number;
}

export type DashboardActionSeverity = 'danger' | 'warning' | 'info';

export interface DashboardActionItemVm {
    key: string;
    title: string;
    description: string;
    severity: DashboardActionSeverity;
    count: number;
    route: string | null;
}
