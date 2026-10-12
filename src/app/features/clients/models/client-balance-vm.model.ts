/** Açık (kalanı > 0) ücret; hayvan ve ziyaret bilgisiyle düzleştirilmiş. */
export interface ClientOpenChargeVm {
    chargeId: string;
    clinicId: string;
    petId: string | null;
    petName: string | null;
    visitId: string | null;
    visitArrivedAtUtc: string | null;
    examinationId: string | null;
    description: string;
    amount: number;
    allocatedAmount: number;
    outstandingAmount: number;
    createdAtUtc: string;
}

export interface ClientBalanceVm {
    clientId: string;
    clientName: string;
    currency: string;
    chargedAmount: number;
    allocatedAmount: number;
    outstandingAmount: number;
    openCharges: ClientOpenChargeVm[];
}
