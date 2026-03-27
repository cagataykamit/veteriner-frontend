/**
 * Yeni ödeme — UI / servis isteği.
 */

export interface CreatePaymentRequest {
    clinicId?: string;
    clientId: string;
    petId?: string | null;
    appointmentId?: string | null;
    examinationId?: string | null;
    amount: number;
    currency: string;
    method: string;
    paidAtUtc?: string;
    notes?: string | null;
    /** @deprecated update/legacy uyumluluğu için tutulur, create mapper kullanmaz. */
    status?: string;
    /** @deprecated update/legacy uyumluluğu için tutulur, create mapper kullanmaz. */
    dueDateUtc?: string;
    /** @deprecated update/legacy uyumluluğu için tutulur, create mapper kullanmaz. */
    note?: string;
}
