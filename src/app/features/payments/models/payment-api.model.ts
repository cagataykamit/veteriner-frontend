/**
 * Backend Veteriner API — ödeme DTO’ları.
 *
 * Okuma: listede `petId` null olabilir; `petName` boş string dönebilir (null varsayılmaz).
 * Detay: `petId`, `appointmentId`, `examinationId`, `notes` null olabilir.
 *
 * POST/PUT çekirdek zorunlu alanlar: clinicId, clientId, amount, currency, method, paidAtUtc.
 * Opsiyonel: petId, appointmentId, examinationId, notes.
 */

/** Liste satırı — GET /payments */
export interface PaymentListItemDto {
    id: string;
    clinicId?: string;
    /** Liste / rapor; backend gönderirse gösterilir. */
    clinicName?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    /** Null olabilir. */
    petId?: string | null;
    /** Boş string olabilir; null da gelebilir. */
    petName?: string | null;
    amount?: number | string | null;
    currency?: string | null;
    /** Backend enum (0 / 1 / 2) veya string. */
    method?: string | number | null;
    paidAtUtc?: string | null;
    /** Liste / rapor satırı; backend gönderirse. */
    notes?: string | null;
}

export interface PaymentListItemDtoPagedResult {
    items?: PaymentListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    /** Rapor toplamı; backend göndermezse istemci satırlardan hesaplar. */
    totalAmount?: number | string | null;
}

/** GET /payments/{id} */
export interface PaymentDetailDto {
    id: string;
    tenantId?: string | null;
    clinicId?: string | null;
    clientId?: string | null;
    clientName?: string | null;
    petId?: string | null;
    /** Boş string olabilir. */
    petName?: string | null;
    appointmentId?: string | null;
    examinationId?: string | null;
    amount?: number | string | null;
    currency?: string | null;
    method?: string | number | null;
    paidAtUtc?: string | null;
    notes?: string | null;
}

export interface PaymentCreateRequestDto {
    clinicId: string;
    clientId: string;
    petId?: string | null;
    appointmentId?: string | null;
    examinationId?: string | null;
    amount: number;
    currency: string;
    method: number;
    paidAtUtc: string;
    notes?: string | null;
}
