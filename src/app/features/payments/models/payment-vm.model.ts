/**
 * Ödeme — UI view modelleri.
 */

export interface PaymentListItemVm {
    id: string;
    clientId: string | null;
    clientName: string;
    petId: string | null;
    petName: string;
    appointmentId: string | null;
    amount: number | null;
    currency: string;
    status: string | null;
    method: string | null;
    dueDateUtc: string | null;
    paidAtUtc: string | null;
    createdAtUtc: string | null;
}

export interface PaymentDetailVm {
    id: string;
    clientId: string | null;
    clientName: string;
    petId: string | null;
    petName: string;
    appointmentId: string | null;
    amount: number | null;
    currency: string;
    status: string | null;
    method: string | null;
    note: string;
    dueDateUtc: string | null;
    paidAtUtc: string | null;
    createdAtUtc: string | null;
    updatedAtUtc: string | null;
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
