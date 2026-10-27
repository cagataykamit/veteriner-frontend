import type { AppointmentListItemDto } from '@/app/entities/appointment/models/appointment-api.model';

/** GET `/api/v1/reports/appointments` */
export interface AppointmentsReportDto {
    totalCount?: number | string | null;
    /** Pencere özeti (`status` filtresi uygulanmaz). */
    statusCounts?: { scheduled?: number | null; completed?: number | null; cancelled?: number | null; noShow?: number | null } | null;
    items?: AppointmentListItemDto[] | null;
}
