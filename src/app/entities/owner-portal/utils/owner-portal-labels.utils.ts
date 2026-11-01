import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import type {
    DataRequestStatus,
    DataRequestType,
    OwnerNotificationCategory,
    OwnerNotificationChannel,
    OwnerNotificationChannelMode
} from '@/app/entities/owner-portal/models/owner-portal.model';

/** Sözleşme enum metinleri → panel etiketi. Tek yer; bilinmeyen değerde nötr metin. */
const DATA_REQUEST_TYPE_LABELS: Record<DataRequestType, string> = {
    Access: 'Erişim',
    Rectification: 'Düzeltme',
    Erasure: 'Silme',
    Objection: 'İtiraz',
    Other: 'Diğer'
};

const DATA_REQUEST_STATUS: Record<DataRequestStatus, { label: string; severity: StatusTagSeverity }> = {
    Open: { label: 'Yeni', severity: 'warn' },
    InProgress: { label: 'Ele alındı', severity: 'info' },
    Completed: { label: 'Tamamlandı', severity: 'success' },
    Rejected: { label: 'Reddedildi', severity: 'danger' },
    Cancelled: { label: 'Sahibi geri çekti', severity: 'secondary' }
};

export function dataRequestTypeLabel(type: string): string {
    return DATA_REQUEST_TYPE_LABELS[type as DataRequestType] ?? 'Diğer';
}

export function dataRequestStatusLabel(status: string): string {
    return DATA_REQUEST_STATUS[status as DataRequestStatus]?.label ?? 'Bilinmiyor';
}

export function dataRequestStatusSeverity(status: string): StatusTagSeverity {
    return DATA_REQUEST_STATUS[status as DataRequestStatus]?.severity ?? 'secondary';
}

/** Açık talep: personel ele alabilir ya da kapatabilir (§11 durum geçişleri). */
export function isDataRequestOpen(status: DataRequestStatus): boolean {
    return status === 'Open' || status === 'InProgress';
}

/** Gelen kutusu filtresi; boş değer tüm durumlar (sunucu açıkları önce sıralar). */
export const DATA_REQUEST_STATUS_FILTER_OPTIONS: { label: string; value: DataRequestStatus | null }[] = [
    { label: 'Tümü (açıklar önce)', value: null },
    { label: 'Yeni', value: 'Open' },
    { label: 'Ele alınanlar', value: 'InProgress' },
    { label: 'Tamamlananlar', value: 'Completed' },
    { label: 'Reddedilenler', value: 'Rejected' },
    { label: 'Sahibi geri çekenler', value: 'Cancelled' }
];

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
    PortalInvite: 'Portal daveti',
    SignInCode: 'Giriş kodu',
    PasswordResetCode: 'Parola sıfırlama kodu',
    AccountDeletionCode: 'Hesap silme onay kodu',
    AccountDeleted: 'Hesap silindi bildirimi',
    AppointmentRequestReceived: 'Randevu talebi alındı',
    AppointmentRequestApproved: 'Randevu talebi onaylandı',
    AppointmentRequestRescheduled: 'Randevu talebi saati değişti',
    AppointmentRequestRejected: 'Randevu talebi reddedildi',
    DataRequestAnswered: 'Veri talebi yanıtı',
    AppointmentReminder: 'Randevu hatırlatması',
    VaccinationReminder: 'Aşı hatırlatması',
    Marketing: 'Kampanya ve duyuru'
};

const NOTIFICATION_CATEGORY_LABELS: Record<OwnerNotificationCategory, string> = {
    Transactional: 'İşlem iletisi',
    Reminder: 'Hatırlatma',
    Marketing: 'Ticari ileti'
};

export const NOTIFICATION_CHANNELS: { channel: OwnerNotificationChannel; label: string }[] = [
    { channel: 'Email', label: 'E-posta' },
    { channel: 'Push', label: 'Mobil bildirim' },
    { channel: 'WhatsAppLink', label: 'WhatsApp' }
];

const CHANNEL_MODE: Record<OwnerNotificationChannelMode, { label: string; severity: StatusTagSeverity }> = {
    Always: { label: 'Her zaman', severity: 'success' },
    Preference: { label: 'Tercihe bağlı', severity: 'info' },
    StaffManual: { label: 'Personel elle', severity: 'contrast' },
    NotConfigured: { label: 'Yapılandırılmadı', severity: 'warn' },
    Disabled: { label: 'Kapalı', severity: 'secondary' }
};

export function notificationTypeLabel(type: string): string {
    return NOTIFICATION_TYPE_LABELS[type] ?? type;
}

export function notificationCategoryLabel(category: string): string {
    return NOTIFICATION_CATEGORY_LABELS[category as OwnerNotificationCategory] ?? category;
}

export function channelModeLabel(mode: string | undefined): string {
    return (mode && CHANNEL_MODE[mode as OwnerNotificationChannelMode]?.label) || 'Kapalı';
}

export function channelModeSeverity(mode: string | undefined): StatusTagSeverity {
    return (mode && CHANNEL_MODE[mode as OwnerNotificationChannelMode]?.severity) || 'secondary';
}
