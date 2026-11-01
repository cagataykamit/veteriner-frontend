/**
 * Hasta sahibi portalı klinik tarafı (PORTAL-009/010; Veteriner `docs/PORTAL_API_CONTRACT.md` §11.2, §12, §13).
 * Enum alanları metin döner; ekranda etiketlenir. Saatler UTC ISO.
 */

/** Yanıt notu sınırı (§11: `ResponseNote nvarchar(2000)`); kapanışta zorunlu, sahibe e-postayla gider. */
export const DATA_REQUEST_RESPONSE_NOTE_MAX = 2000;

export type DataRequestType = 'Access' | 'Rectification' | 'Erasure' | 'Objection' | 'Other';
export type DataRequestStatus = 'Open' | 'InProgress' | 'Completed' | 'Rejected' | 'Cancelled';
/** Personelin verebileceği durumlar (§11.2). */
export type DataRequestStaffStatus = Extract<DataRequestStatus, 'InProgress' | 'Completed' | 'Rejected'>;

/** `StaffDataRequestDto` (§11.2). */
export interface StaffDataRequestVm {
    id: string;
    clinicId: string;
    clinicName: string;
    clientId: string;
    clientName: string;
    type: DataRequestType;
    status: DataRequestStatus;
    message: string;
    createdAtUtc: string;
    dueAtUtc: string;
    isOverdue: boolean;
    handledByUserId: string | null;
    handledAtUtc: string | null;
    responseNote: string | null;
}

export interface DataRequestListQuery {
    status: DataRequestStatus | null;
    page: number;
    pageSize: number;
}

export interface DataRequestPageVm {
    items: StaffDataRequestVm[];
    totalItems: number;
    page: number;
    pageSize: number;
}

/** Menü rozeti: açık = `Open` + `InProgress`. */
export interface PortalInboxSummaryVm {
    openDataRequestCount: number;
    overdueDataRequestCount: number;
}

/** `GET/PUT clinics/{id}/portal-settings` (§12): kayıt yoksa açık. */
export interface ClinicPortalSettingsVm {
    clinicId: string;
    isEnabled: boolean;
    updatedAtUtc: string | null;
    activeLinkCount: number;
    pendingInviteCount: number;
}

export type OwnerNotificationChannel = 'Email' | 'Push' | 'WhatsAppLink';
export type OwnerNotificationChannelMode = 'Always' | 'Preference' | 'StaffManual' | 'NotConfigured' | 'Disabled';
export type OwnerNotificationCategory = 'Transactional' | 'Reminder' | 'Marketing';

/** `GET portal-notification-rules` satırı (§13): tür × kanal; salt okunur. */
export interface OwnerNotificationRuleVm {
    type: string;
    category: OwnerNotificationCategory;
    channels: { channel: OwnerNotificationChannel; mode: OwnerNotificationChannelMode }[];
}
