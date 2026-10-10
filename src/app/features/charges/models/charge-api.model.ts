/**
 * Ücret (Charge) API DTO'ları — `docs/CHARGES_API_CONTRACT.md`.
 * Yalnızca mapper ve servis kullanır.
 */

export interface ChargeDto {
    id: string;
    clinicId: string;
    clientId: string;
    clientName: string;
    petId?: string | null;
    petName?: string | null;
    visitId?: string | null;
    examinationId?: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    currency: string;
    createdByUserId: string;
    createdAtUtc: string;
}

export interface ChargePagedResultDto {
    items?: ChargeDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface ChargeCreateResultDto {
    created: boolean;
    charge: ChargeDto;
}

/** POST /charges gövdesi; tutar ve para birimi istemciden gönderilmez. */
export interface ChargeCreateRequestDto {
    clinicId: string;
    clientId: string;
    petId: string | null;
    visitId: string | null;
    examinationId: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    requestId: string | null;
}
