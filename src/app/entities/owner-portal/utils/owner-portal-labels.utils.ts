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
    FollowUpReminder: 'Kontrol hatırlatması',
    DebtReminder: 'Ödeme hatırlatması',
    NoReturnReminder: 'Uzun süredir gelmedi',
    Marketing: 'Kampanya ve duyuru',
    WaitlistOffer: 'Bekleme listesi teklifi'
};

const NOTIFICATION_CATEGORY_LABELS: Record<OwnerNotificationCategory, string> = {
    Transactional: 'İşlem iletisi',
    Reminder: 'Hatırlatma',
    Marketing: 'Ticari ileti'
};

/** Ayarlar › Hasta sahibi portalı tablosunun kategori grupları (A-04): sıra, grup başlığı ve tek cümlelik açıklama. */
export const NOTIFICATION_CATEGORIES: { category: OwnerNotificationCategory; title: string; description: string }[] = [
    { category: 'Transactional', title: 'İşlem iletileri', description: 'Hasta sahibinin tercihiyle kapanmaz.' },
    { category: 'Reminder', title: 'Hatırlatmalar', description: 'Hasta sahibi portaldan kapatabilir.' },
    { category: 'Marketing', title: 'Ticari iletiler', description: 'Yalnız izin veren hasta sahibine gider.' }
];

export const NOTIFICATION_CHANNELS: { channel: OwnerNotificationChannel; label: string; icon: string }[] = [
    { channel: 'Email', label: 'E-posta', icon: 'pi pi-envelope' },
    { channel: 'Push', label: 'Mobil bildirim', icon: 'pi pi-mobile' },
    { channel: 'WhatsAppLink', label: 'WhatsApp', icon: 'pi pi-whatsapp' }
];

/** Sütun başlığının altındaki kısa not: WhatsApp'ı personel açar; mobil bildirim hiçbir satırda yapılandırılmadıysa henüz hazır değil. */
export function notificationChannelHint(channel: OwnerNotificationChannel, rules: readonly { channels: { channel: OwnerNotificationChannel; mode: OwnerNotificationChannelMode }[] }[]): string {
    if (channel === 'WhatsAppLink') {
        return 'Personel elle açar';
    }

    const notReady = rules.some((r) => r.channels.some((c) => c.channel === channel && c.mode === 'NotConfigured'));

    return notReady ? 'Henüz hazır değil' : 'Sistem gönderir';
}

/** "Personel elle" nötr gri (siyah değil, A-04); kapalıdan simgesiyle ayrılır. */
const CHANNEL_MODE: Record<OwnerNotificationChannelMode, { label: string; severity: StatusTagSeverity; icon?: string }> = {
    Always: { label: 'Her zaman', severity: 'success' },
    Preference: { label: 'Tercihe bağlı', severity: 'info' },
    StaffManual: { label: 'Personel elle', severity: 'secondary', icon: 'pi pi-user' },
    NotConfigured: { label: 'Yapılandırılmadı', severity: 'warn', icon: 'pi pi-exclamation-triangle' },
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
export function channelModeIcon(mode: string | undefined): string | undefined {
    return mode ? CHANNEL_MODE[mode as OwnerNotificationChannelMode]?.icon : undefined;
}
