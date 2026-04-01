/**
 * Ödeme — UI view modelleri.
 */

/** Liste — backend batch ile `clientName` / `petName`. */
export interface PaymentListItemVm {
    id: string;
    clientId: string | null;
    clientName: string;
    petId: string | null;
    petName: string;
    amount: number | null;
    currency: string;
    method: string | null;
    paidAtUtc: string | null;
}

/** Detay — GET /payments/{id} aggregate. */
export interface PaymentDetailVm {
    id: string;
    clientId: string | null;
    clientName: string;
    petId: string | null;
    petName: string;
    amount: number | null;
    currency: string;
    method: string | null;
    note: string;
    paidAtUtc: string | null;
    appointmentId: string | null;
    examinationId: string | null;
}

export interface PaymentEditVm {
    id: string;
    clientId: string;
    petId: string;
    amountStr: string;
    currency: string;
    method: string;
    paidAtUtc: string | null;
    note: string;
}
