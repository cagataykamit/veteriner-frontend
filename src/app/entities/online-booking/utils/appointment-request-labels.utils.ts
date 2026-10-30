import { AppointmentRequestActorKind, AppointmentRequestSource, AppointmentRequestStatus } from '@/app/entities/online-booking/models/online-booking.model';

export type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary';

const STATUS: Record<AppointmentRequestStatus, { label: string; severity: TagSeverity }> = {
    [AppointmentRequestStatus.Pending]: { label: 'Bekliyor', severity: 'warn' },
    [AppointmentRequestStatus.Approved]: { label: 'Onaylandı', severity: 'success' },
    [AppointmentRequestStatus.Rejected]: { label: 'Reddedildi', severity: 'danger' },
    [AppointmentRequestStatus.Cancelled]: { label: 'İptal', severity: 'secondary' },
    [AppointmentRequestStatus.Expired]: { label: 'Süresi doldu', severity: 'secondary' }
};

export function appointmentRequestStatusLabel(status: AppointmentRequestStatus): string {
    return STATUS[status]?.label ?? 'Bilinmiyor';
}

export function appointmentRequestStatusSeverity(status: AppointmentRequestStatus): TagSeverity {
    return STATUS[status]?.severity ?? 'secondary';
}

export function appointmentRequestSourceLabel(source: AppointmentRequestSource): string {
    return source === AppointmentRequestSource.Portal ? 'Portal' : 'Bağlantı';
}

export function appointmentRequestActorLabel(kind: AppointmentRequestActorKind, actorName: string | null): string {
    switch (kind) {
        case AppointmentRequestActorKind.Owner:
            return 'Hasta sahibi';
        case AppointmentRequestActorKind.System:
            return 'Sistem';
        default:
            return actorName?.trim() || 'Personel';
    }
}

/** Kuyruk filtresi seçenekleri; boş değer tüm durumlar. */
export const APPOINTMENT_REQUEST_STATUS_FILTER_OPTIONS: { label: string; value: AppointmentRequestStatus | null }[] = [
    { label: 'Bekleyenler', value: AppointmentRequestStatus.Pending },
    { label: 'Onaylananlar', value: AppointmentRequestStatus.Approved },
    { label: 'Reddedilenler', value: AppointmentRequestStatus.Rejected },
    { label: 'İptal edilenler', value: AppointmentRequestStatus.Cancelled },
    { label: 'Süresi dolanlar', value: AppointmentRequestStatus.Expired },
    { label: 'Tümü', value: null }
];
