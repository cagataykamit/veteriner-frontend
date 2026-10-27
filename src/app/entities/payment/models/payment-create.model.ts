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

/** `PAYMENT_ALLOCATION_API_CONTRACT.md` §2: `requestId` ve tahsis zorunlu; tahsis toplamı `amount`'a eşit. */
export interface CreatePaymentRequest extends UpdatePaymentRequest {
    /** Form başına bir kez üretilen anahtar; aynı anahtarla tekrar istek ikinci ödeme üretmez. */
    requestId: string;
    allocations: PaymentAllocationInput[];
}
