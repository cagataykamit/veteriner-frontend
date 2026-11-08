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
    /** Bazı rapor / batch yanıtlarında kimlik bu alanda gelebilir. */
    paymentId?: string | null;
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
    /** Tahsis edilen ücretlerin farklı hayvan sayısı; 1'den büyükse petId null. Query DB yolunda null. */
    petCount?: number | null;
    amount?: number | string | null;
    currency?: string | null;
    /** Backend enum (0 / 1 / 2) veya string. */
    method?: string | number | null;
    paidAtUtc?: string | null;
    /** Liste / rapor satırı; backend gönderirse. */
    notes?: string | null;
    /** Nakit ödemenin kasası (kasası boşsa Ana kasa); kart, havale ve Query DB yolunda null (`CASH_REGISTERS_API_CONTRACT.md` §4). */
    cashRegisterId?: string | null;
    cashRegisterName?: string | null;
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
    /** Bkz. liste petCount. */
    petCount?: number | null;
    appointmentId?: string | null;
    examinationId?: string | null;
    amount?: number | string | null;
    currency?: string | null;
    method?: string | number | null;
    paidAtUtc?: string | null;
    notes?: string | null;
    /** FIN-005: ödemenin müşteri kredisine yazılan kısmı (`CLIENT_CREDIT_API_CONTRACT.md` §3). */
    creditedAmount?: number | string | null;
    /** Bkz. liste cashRegisterName. */
    cashRegisterId?: string | null;
    cashRegisterName?: string | null;
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

/** POST /payments gövdesi — `PAYMENT_ALLOCATION_API_CONTRACT.md` §2 (kırıcı: `requestId` ve `allocations` zorunlu). */
export interface PaymentCreateWithAllocationsRequestDto extends PaymentCreateRequestDto {
    requestId: string;
    allocations: Array<{ chargeId: string; amount: number }>;
    /** `CLIENT_CREDIT_API_CONTRACT.md` §3: yalnız > 0 iken gönderilir. */
    creditAmount?: number;
    /** `CASH_REGISTERS_API_CONTRACT.md` §4: yalnız nakitte ve seçildiyse gönderilir. */
    cashRegisterId?: string;
}
