import type { ClientContactChannel } from '@/app/features/clients/utils/client-contact-preference.utils';

/**
 * Swagger ile uyumlu ham DTO'lar (Backend Veteriner API).
 * İleride API'ye ek alan gelince burada genişletilir.
 */

export interface ClientListItemDto {
    id: string;
    tenantId: string;
    fullName?: string | null;
    phone?: string | null;
    /** Swagger sonraki sürümlerde eklenebilir — opsiyonel */
    email?: string | null;
    createdAtUtc?: string | null;
}

export interface ClientListItemDtoPagedResult {
    items?: ClientListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface ClientDetailDto {
    id: string;
    tenantId: string;
    fullName?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    createdAtUtc?: string | null;
    updatedAtUtc?: string | null;
    /** `None` | `Phone` | `Email` | `Sms` | `WhatsApp` (sözleşme §2; her zaman döner, eski yanıtta yok → `None`). */
    preferredContactChannel?: string | null;
    /** `true`: otomatik aşı/randevu hatırlatma e-postası gönderilmez. */
    remindersOptedOut?: boolean | null;
    /** KVKK rıza alanları ve kayıt sürümü (`KVKK_CONSENT_API_CONTRACT.md` §1); alan adları `ClientKvkkConsentDto` ile aynı. */
    kvkkConsentStatus?: string | number | null;
    /** `yyyy-MM-dd` (İstanbul takvim günü); yalnız `Accepted`/`Declined` iken dolu. */
    kvkkConsentRecordedOn?: string | null;
    kvkkConsentRecordedByUserId?: string | null;
    kvkkConsentRecordedByName?: string | null;
    /** İşaretleme anındaki açık rıza metni sürümü (ADR-032): `0` varsayılan metin, `null` bilinmiyor. */
    kvkkConsentTemplateVersion?: number | null;
    /** O metnin SHA-256 özeti (64 karakter hex, tam değer). */
    kvkkConsentTemplateHash?: string | null;
    /** Base64; `PUT /clients/{id}/kvkk-consent` için zorunlu. */
    rowVersion?: string | null;
    /** Fatura kimliği, TCKN/VKN maskeli (`INVOICING_IDENTITY_API_CONTRACT.md` §2); eski yanıtta yok. */
    invoicing?: ClientInvoicingSummaryDto | null;
}

/** Fatura alıcısı türü; `null` = belirtilmemiş. */
export type ClientPersonType = 'Individual' | 'Corporate';

/** Okuma görünümü (detay, veri kopyası): numaralar yalnız maskeli. */
export interface ClientInvoicingSummaryDto {
    personType?: ClientPersonType | null;
    nationalIdMasked?: string | null;
    taxNumberMasked?: string | null;
    taxOffice?: string | null;
    legalName?: string | null;
    billingProvince?: string | null;
    billingDistrict?: string | null;
    billingAddressLine?: string | null;
}

/**
 * Tam değerli fatura kimliği: `GET /clients/{id}/invoicing-identity` yanıtı (`Clients.Update`) ve
 * POST/PUT gövdesindeki `invoicingIdentity` (PUT'ta alan yok = dokunma; verilirse tam değiştirme).
 */
export interface ClientInvoicingIdentityDto {
    personType: ClientPersonType | null;
    nationalId: string | null;
    taxNumber: string | null;
    taxOffice: string | null;
    legalName: string | null;
    billingProvince: string | null;
    billingDistrict: string | null;
    billingAddressLine: string | null;
}

/** `PUT /clients/{id}/kvkk-consent` gövdesi; `None` iken `recordedOn` gönderilmez. */
export interface ClientKvkkConsentUpdateRequestDto {
    status: string;
    recordedOn?: string;
    rowVersion: string;
}

/** `PUT /clients/{id}/kvkk-consent` yanıtı (200); `remindersOptedOut` yazımdan sonraki bayraktır (Ret açar, ADR-025). */
export type ClientKvkkConsentDto = Pick<
    ClientDetailDto,
    | 'id'
    | 'kvkkConsentStatus'
    | 'kvkkConsentRecordedOn'
    | 'kvkkConsentRecordedByUserId'
    | 'kvkkConsentRecordedByName'
    | 'kvkkConsentTemplateVersion'
    | 'kvkkConsentTemplateHash'
    | 'remindersOptedOut'
    | 'rowVersion'
>;

/**
 * POST/PUT /clients gövdesi — camelCase (Swagger ile doğrulanmalı).
 * Opsiyonel alanlar backend’de yoksa mapper’dan çıkarılabilir.
 */
export interface ClientUpsertRequestDto {
    fullName: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    /** PUT'ta alan yok = dokunma; temizlemek için `None`. */
    preferredContactChannel?: ClientContactChannel;
    /** PUT'ta alan yok = dokunma; kaldırmak için `false`. */
    remindersOptedOut?: boolean;
    /** Alan yok = dokunma (PUT) / boş (POST); verilirse nesnenin tamamı yazılır. */
    invoicingIdentity?: ClientInvoicingIdentityDto;
}

/** GET /clients/{id}/recent-summary — panel müşteri detay özeti. */
export interface ClientRecentAppointmentSummaryItemDto {
    id: string;
    scheduledAtUtc?: string | null;
    petId?: string | null;
    petName?: string | null;
    status?: string | number | null;
    notes?: string | null;
    durationMinutes?: number | string | null;
    scheduledEndUtc?: string | null;
}

export interface ClientRecentExaminationSummaryItemDto {
    id: string;
    examinedAtUtc?: string | null;
    petId?: string | null;
    petName?: string | null;
    visitReason?: string | null;
}

export interface ClientRecentSummaryDto {
    clientId: string;
    recentAppointments?: ClientRecentAppointmentSummaryItemDto[] | null;
    recentExaminations?: ClientRecentExaminationSummaryItemDto[] | null;
}

/** GET /clients/{id}/payment-summary — Finance+ müşteri ödeme özeti. */
export interface ClientPaymentSummaryCurrencyTotalDto {
    currency?: string | null;
    totalAmount?: number | null;
}

export interface ClientPaymentSummaryRecentPaymentDto {
    id: string;
    paidAtUtc?: string | null;
    clinicId?: string | null;
    clinicName?: string | null;
    petId?: string | null;
    petName?: string | null;
    amount?: number | null;
    currency?: string | null;
    method?: number | string | null;
    notes?: string | null;
}

export interface ClientPaymentSummaryDto {
    clientId: string;
    clientName?: string | null;
    totalPaymentsCount?: number | null;
    totalPaidAmount?: number | null;
    currencyTotals?: ClientPaymentSummaryCurrencyTotalDto[] | null;
    lastPaymentAtUtc?: string | null;
    recentPayments?: ClientPaymentSummaryRecentPaymentDto[] | null;
}

/** POST /clients/quick-register yanıtı (201). */
export interface QuickRegisterResultDto {
    clientId?: string | null;
    petId?: string | null;
}
