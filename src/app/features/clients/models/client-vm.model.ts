import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import type { ExaminationListItemVm } from '@/app/features/examinations/models/examination-vm.model';
import type { ClientContactChannel } from '@/app/features/clients/utils/client-contact-preference.utils';
import type { KvkkConsentStatus } from '@/app/features/clients/utils/client-kvkk-consent.utils';

export interface ClientListItemVm {
    id: string;
    fullName: string;
    phone: string;
    email: string;
    createdAtUtc: string | null;
}

export interface ClientDetailVm {
    id: string;
    fullName: string;
    phone: string;
    email: string;
    address: string;
    createdAtUtc: string | null;
    updatedAtUtc: string | null;
    preferredContactChannel: ClientContactChannel;
    remindersOptedOut: boolean;
    kvkkConsent: ClientKvkkConsentVm;
    /** Rıza işareti için kayıt sürümü; okunamazsa `null` (işaretleme kapalı). */
    rowVersion: string | null;
}

/** İmzalı KVKK formunun sonucu; `None` iken tarih, işaretleyen ve metin sürümü boş. */
export interface ClientKvkkConsentVm {
    status: KvkkConsentStatus;
    /** `yyyy-MM-dd` */
    recordedOn: string | null;
    recordedByName: string | null;
    /** İşaretleme anındaki açık rıza metni sürümü (ADR-032): `0` varsayılan metin, `null` bilinmiyor. */
    templateVersion: number | null;
    /** O metnin SHA-256 özeti (tam değer) veya `null`. */
    templateHash: string | null;
}

export interface ClientKvkkConsentUpdateRequest {
    status: KvkkConsentStatus;
    /** `yyyy-MM-dd`; boş = sunucuda bugün. `None` iken yok sayılır. */
    recordedOn: string | null;
    rowVersion: string;
}

/** Yanıt müşteri detayına birleştirilir; sonraki yazım yeni `rowVersion` ile yapılır. Ret hatırlatma bayrağını açar (ADR-025). */
export type ClientKvkkConsentUpdateResult = Pick<ClientDetailVm, 'kvkkConsent' | 'remindersOptedOut' | 'rowVersion'>;

/** `GET .../clients/{id}/recent-summary` eşlemesi. */
export interface ClientRecentSummaryVm {
    clientId: string;
    /** Sıra backend’de (tarih desc, id desc). */
    appointments: AppointmentListItemVm[];
    examinations: ExaminationListItemVm[];
}

/** GET /clients/{id}/payment-summary */
export interface ClientPaymentSummaryCurrencyTotalVm {
    currency: string;
    totalAmount: number | null;
}

export interface ClientPaymentSummaryRecentPaymentVm {
    id: string;
    paidAtUtc: string | null;
    clinicId: string | null;
    clinicName: string | null;
    petId: string | null;
    petName: string | null;
    amount: number | null;
    currency: string | null;
    method: unknown;
    notes: string | null;
}

export interface ClientPaymentSummaryVm {
    clientId: string;
    clientName: string;
    totalPaymentsCount: number;
    /** Çoklu para biriminde 0 olabilir; asıl doğruluk `currencyTotals`. */
    totalPaidAmount: number | null;
    currencyTotals: ClientPaymentSummaryCurrencyTotalVm[];
    lastPaymentAtUtc: string | null;
    recentPayments: ClientPaymentSummaryRecentPaymentVm[];
}
