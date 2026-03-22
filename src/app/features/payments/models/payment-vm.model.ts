/**
 * Ödeme — UI view modelleri.
 */

export interface PaymentListItemVm {
    id: string;
    clientId: string | null;
    clientName: string;
    petId: string | null;
    petName: string;
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
