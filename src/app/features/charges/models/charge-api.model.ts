import type { ChargeLineKind } from '@/app/features/charges/utils/charge-tax.utils';

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
    /** Tahsis edilen toplam (`PAYMENT_ALLOCATION_API_CONTRACT.md`); eski yanıtlarda yok. */
    allocatedAmount?: number | null;
    /** `amount − allocatedAmount`. */
    outstandingAmount?: number | null;
    currency: string;
    createdByUserId: string;
    createdAtUtc: string;
    /** Satır türü (ADR-036); eski yanıtta yok → `Service`. */
    lineKind?: string | null;
    /** KDV oranı (%); `null` = klinik varsayılanı. */
    vatRate?: number | null;
}

/** `POST/PUT /charges` isteğe bağlı `tax` nesnesi (`INVOICING_IDENTITY_API_CONTRACT.md` §5). */
export interface ChargeTaxDto {
    lineKind: ChargeLineKind;
    vatRate: number | null;
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

/** PUT /charges/{id} gövdesi (`Charges.Correct`); müşteri/hayvan/geliş/muayene değişmez. */
export interface ChargeCorrectionRequestDto {
    description: string;
    quantity: number;
    unitPrice: number;
    reason: string;
    /** Verilmezse satır türü ve KDV oranına dokunulmaz. */
    tax?: ChargeTaxDto;
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
    tax?: ChargeTaxDto;
}
