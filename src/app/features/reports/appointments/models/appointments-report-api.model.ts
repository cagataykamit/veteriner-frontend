import type { AppointmentListItemDto } from '@/app/features/appointments/models/appointment-api.model';

/** GET `/api/v1/reports/appointments` */
export interface AppointmentsReportDto {
    totalCount?: number | string | null;
    items?: AppointmentListItemDto[] | null;
}
