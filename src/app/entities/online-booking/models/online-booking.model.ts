/**
 * Online randevu talebi modelleri (ADR-042; Veteriner `docs/ONLINE_APPOINTMENT_API_CONTRACT.md`). Sunucu enum'ları sayıdır;
 * saatler UTC ISO, gösterim İstanbul duvar saati.
 */

export const APPOINTMENT_REASON_NAME_MAX = 100;
export const APPOINTMENT_DURATION_MIN = 5;
export const APPOINTMENT_DURATION_MAX = 240;
export const REJECTION_REASON_MIN = 3;
export const REJECTION_REASON_MAX = 500;
export const EMAIL_SUBJECT_MAX = 200;
export const EMAIL_BODY_MAX = 4000;

export interface AppointmentReasonVm {
    id: string;
    clinicId: string;
    name: string;
    defaultDurationMinutes: number;
    isOnlineBookable: boolean;
    sortOrder: number;
    isActive: boolean;
    /** Boş = klinikteki tüm hekimler uygun. */
    veterinarianUserIds: string[];
}

export interface AppointmentReasonFormValue {
    name: string;
    defaultDurationMinutes: number;
    isOnlineBookable: boolean;
    sortOrder: number | null;
    veterinarianUserIds: string[];
}

export interface OnlineBookingSettingsVm {
    clinicId: string;
    isEnabled: boolean;
    minLeadMinutes: number;
    maxAdvanceDays: number;
    /** En yakın müsait saatler klinik sitesinde görünsün mü (TIER-017); varsayılan açık, online randevu kapalıyken etkisiz. */
    showNextAvailableSlots: boolean;
    bookingCode: string | null;
    bookingUrl: string | null;
    bookingCodeGeneratedAtUtc: string | null;
}

export interface StaffAvailabilitySlotVm {
    startUtc: string;
    endUtc: string;
    freeVeterinarianUserIds: string[];
}

export interface StaffAvailabilityDayVm {
    /** İstanbul takvim günü (yyyy-MM-dd). */
    date: string;
    slots: StaffAvailabilitySlotVm[];
}

/** Sunucu `AppointmentRequestStatus`. */
export enum AppointmentRequestStatus {
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    Cancelled = 3,
    Expired = 4
}

/** Sunucu `AppointmentRequestSource`. */
export enum AppointmentRequestSource {
    Portal = 0,
    Link = 1
}

/** Sunucu `AppointmentRequestChannel` (TIER-016, sözleşme §14): talebin kaynağı; eski talepte `null`. */
export enum AppointmentRequestChannel {
    ClinicLink = 0,
    ClinicSite = 1,
    OwnerPortal = 2,
    Phone = 3,
    VetFinder = 4,
    /** Panelin verdiği düğme ve gömme kodu (`?kaynak=dis-site`, APPT-020/021). */
    ExternalSite = 5
}

export interface AppointmentRequestChannelSummaryRowVm {
    channel: AppointmentRequestChannel | null;
    total: number;
    approved: number;
}

/** Kaynağa göre özet; `from`/`to` İstanbul günleri (yyyy-MM-dd), talep tarihine göre. */
export interface AppointmentRequestChannelSummaryVm {
    from: string;
    to: string;
    rows: AppointmentRequestChannelSummaryRowVm[];
    total: number;
    approved: number;
}

/** Sunucu `AppointmentRequestActorKind`. */
export enum AppointmentRequestActorKind {
    Owner = 0,
    Staff = 1,
    System = 2
}

/** Sunucu `AppointmentRequestEmailKind`; route'ta ad kullanılır. */
export enum AppointmentRequestEmailKind {
    Received = 0,
    Approved = 1,
    Rescheduled = 2,
    Rejected = 3
}

export const APPOINTMENT_REQUEST_EMAIL_KIND_NAMES: Record<AppointmentRequestEmailKind, string> = {
    [AppointmentRequestEmailKind.Received]: 'Received',
    [AppointmentRequestEmailKind.Approved]: 'Approved',
    [AppointmentRequestEmailKind.Rescheduled]: 'Rescheduled',
    [AppointmentRequestEmailKind.Rejected]: 'Rejected'
};

export const APPOINTMENT_REQUEST_EMAIL_KIND_LABELS: Record<AppointmentRequestEmailKind, string> = {
    [AppointmentRequestEmailKind.Received]: 'Talep alındı',
    [AppointmentRequestEmailKind.Approved]: 'Onaylandı',
    [AppointmentRequestEmailKind.Rescheduled]: 'Saat değiştirildi',
    [AppointmentRequestEmailKind.Rejected]: 'Reddedildi'
};

export interface AppointmentRequestListItemVm {
    id: string;
    clinicId: string;
    status: AppointmentRequestStatus;
    source: AppointmentRequestSource;
    /** Boşsa kaynak bilinmiyor (TIER-016 öncesi talep). */
    channel: AppointmentRequestChannel | null;
    /** Boşsa sahip "Diğer / emin değilim" seçti; ne için geldiği `ownerNote`'tadır (ADR-042 eki). */
    reasonId: string | null;
    reasonName: string;
    requestedStartUtc: string;
    durationMinutes: number;
    contactName: string;
    contactEmail: string;
    contactPhone: string | null;
    clientId: string | null;
    clientName: string | null;
    petId: string | null;
    petName: string | null;
    createdAtUtc: string;
    appointmentId: string | null;
}

export interface AppointmentRequestHistoryVm {
    fromStatus: AppointmentRequestStatus | null;
    toStatus: AppointmentRequestStatus;
    actorKind: AppointmentRequestActorKind;
    actorUserId: string | null;
    actorName: string | null;
    note: string | null;
    atUtc: string;
}

export interface ClientMatchVm {
    clientId: string;
    fullName: string;
    phone: string | null;
    email: string | null;
    pets: { id: string; name: string }[];
}

export interface AppointmentRequestDetailVm {
    summary: AppointmentRequestListItemVm;
    petSpecies: string | null;
    petBreed: string | null;
    ownerNote: string | null;
    approvedStartUtc: string | null;
    approvedVeterinarianUserId: string | null;
    wasRescheduled: boolean;
    rejectionReason: string | null;
    closedAtUtc: string | null;
    history: AppointmentRequestHistoryVm[];
    clientMatches: ClientMatchVm[];
    requestedSlotFree: boolean;
    freeVeterinarianUserIds: string[];
}

export interface PagedVm<T> {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
}

/** Sunucu `PagedResult<T>` gövdesi: toplam `totalItems` alanındadır (`totalCount` değil). */
export interface PagedResultDto<T> {
    items?: T[] | null;
    page?: number;
    pageSize?: number;
    totalItems?: number;
    totalPages?: number;
}

export function toPagedVm<T>(r: PagedResultDto<T> | null | undefined, page: number, pageSize: number): PagedVm<T> {
    return { items: r?.items ?? [], totalCount: r?.totalItems ?? 0, page: r?.page ?? page, pageSize: r?.pageSize ?? pageSize };
}

export interface AppointmentRequestListQuery {
    clinicId?: string | null;
    status?: AppointmentRequestStatus | null;
    fromUtc?: string | null;
    toUtc?: string | null;
    page?: number;
    pageSize?: number;
}

export interface EmailMessageVm {
    subject: string;
    body: string;
}

export interface ApproveAppointmentRequestInput {
    clientId?: string | null;
    petId?: string | null;
    scheduledAtUtc?: string | null;
    veterinarianUserId?: string | null;
    durationMinutes?: number | null;
    email?: EmailMessageVm | null;
}

export interface AppointmentRequestEmailTemplateVm {
    kind: AppointmentRequestEmailKind;
    subject: string;
    body: string;
    isDefault: boolean;
}

export interface AppointmentRequestEmailTemplatesVm {
    templates: AppointmentRequestEmailTemplateVm[];
    placeholders: string[];
}
