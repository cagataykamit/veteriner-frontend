/**
 * GET /clients/{id}/balance — `CLIENT_BALANCE_API_CONTRACT.md` §3.
 * Yalnızca mapper ve servis kullanır. Eski ödemeler (`unallocatedPayments`) bu ekranlarda okunmaz.
 */

export interface ClientBalanceChargeDto {
    chargeId: string;
    clinicId: string;
    examinationId?: string | null;
    description: string;
    amount: number;
    allocatedAmount: number;
    outstandingAmount: number;
    createdAtUtc: string;
}

export interface ClientBalanceVisitDto {
    visitId?: string | null;
    visitArrivedAtUtc?: string | null;
    outstandingAmount: number;
    charges?: ClientBalanceChargeDto[] | null;
}

export interface ClientBalancePetDto {
    petId?: string | null;
    petName?: string | null;
    outstandingAmount: number;
    visits?: ClientBalanceVisitDto[] | null;
}

export interface ClientBalanceDto {
    clientId: string;
    clientName?: string | null;
    clinicId?: string | null;
    currency: string;
    chargedAmount: number;
    allocatedAmount: number;
    outstandingAmount: number;
    openChargeCount: number;
    pets?: ClientBalancePetDto[] | null;
}
