import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

export interface AppointmentCalendarItemVm {
    id: string;
    clinicId: string | null;
    petId: string | null;
    clientId: string | null;
    scheduledAtUtc: string | null;
    scheduledEndUtc: string | null;
    durationMinutes: number;
    durationLabel: string;
    localDateLabel: string;
    /** Yerel saat (başlangıç) — geriye dönük uyumluluk. */
    timeLabel: string;
    /** Başlangıç–bitiş yerel saatleri (bitiş yoksa başlangıçla aynı görünüm). */
    timeRangeLabel: string;
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
