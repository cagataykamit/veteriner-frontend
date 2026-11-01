/**
 * Ödeme yazma — UI / servis isteği.
 */

/** Ortak yazma alanları (`POST` ve `PUT`). */
export interface UpdatePaymentRequest {
    clinicId: string;
    clientId: string;
    petId?: string | null;
    appointmentId?: string | null;
    examinationId?: string | null;
    amount: number;
    currency: string;
    method: string;
    paidAtUtc: string;
    notes?: string | null;
}

export interface PaymentAllocationInput {
    chargeId: string;
    amount: number;
}

/**
 * `PAYMENT_ALLOCATION_API_CONTRACT.md` §2, `CLIENT_CREDIT_API_CONTRACT.md` §3: `requestId` zorunlu; Σ tahsis + `creditAmount` = `amount`.
 * `creditAmount` > 0 iken tahsis boş olabilir (avans).
 */
export interface CreatePaymentRequest extends UpdatePaymentRequest {
    /** Form başına bir kez üretilen anahtar; aynı anahtarla tekrar istek ikinci ödeme üretmez. */
    requestId: string;
    allocations: PaymentAllocationInput[];
    /** Ücretlere bağlanmayan kısım (fazla ödeme ya da avans) müşteri kredisine yazılır. */
    creditAmount?: number;
}
