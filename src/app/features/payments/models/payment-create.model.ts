/**
 * Yeni ödeme — UI / servis isteği.
 */

export interface CreatePaymentRequest {
    clientId: string;
    petId: string;
    amount: number;
    currency: string;
    method: string;
    status: string;
    dueDateUtc?: string;
    paidAtUtc?: string;
    note?: string;
}
