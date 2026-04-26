import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

export interface AppointmentCalendarItemVm {
    id: string;
    clinicId: string | null;
    petId: string | null;
    clientId: string | null;
    scheduledAtUtc: string | null;
    localDateLabel: string;
    timeLabel: string;
    status: string | number | null;
    statusLabel: string;
    statusSeverity: StatusTagSeverity;
    appointmentTypeLabel: string;
    petName: string;
    clientName: string;
}

export interface AppointmentCalendarDayGroupVm {
    dateKey: string;
    dateLabel: string;
    items: AppointmentCalendarItemVm[];
}
