import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import type { CalendarItemState } from '@/app/entities/vaccination/models/vaccination-calendar.model';

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
    veterinarianUserId: string | null;
    /** Hekimin görünen adı; hekimsiz ya da ad yoksa boş. */
    veterinarianName: string;
    /** Randevu nedeni; yoksa `null` (balonda tür yazılır). */
    reasonName: string | null;
    notes: string | null;
    /** Takvim durumu (sözleşme §6.1, §8.3): renk bu alandan; iptal ve gelmedi randevuda `null`. */
    state: CalendarItemState | null;
    /** Oda ve cihaz (ADR-053); yoksa `null`. Takvimin kaynak görünümü sütunları bu kimliklerden çizer. */
    roomResourceId: string | null;
    roomResourceName: string | null;
    equipmentResourceId: string | null;
    equipmentResourceName: string | null;
}

export interface AppointmentCalendarDayGroupVm {
    dateKey: string;
    dateLabel: string;
    items: AppointmentCalendarItemVm[];
}
