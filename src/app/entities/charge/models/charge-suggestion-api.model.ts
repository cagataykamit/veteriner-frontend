/**
 * Ücret bekleyen kalem (ChargeSuggestion) API DTO'ları — `docs/CHARGE_SUGGESTION_API_CONTRACT.md`.
 * Yalnızca mapper ve servis kullanır.
 */

export type ChargeSuggestionStatusDto = 'Pending' | 'Converted' | 'Waived' | 'Cancelled';

export interface ChargeSuggestionDto {
    id: string;
    /** Bugün yalnız `Administration`. */
    sourceType: string;
    sourceId: string;
    clinicId: string;
    clientId: string;
    clientName: string;
    petId: string;
    petName: string;
    examinationId?: string | null;
    visitId?: string | null;
    productId: string;
    /** Ürün/hizmet adı. */
    description: string;
    quantity: number;
    unit: string;
    /** Kalemin doğduğu andaki katalog fiyatı; `null`: resepsiyon girer. */
    suggestedUnitPrice?: number | null;
    currency: string;
    occurredAtUtc: string;
    status: ChargeSuggestionStatusDto;
    chargeId?: string | null;
    resolvedAtUtc?: string | null;
    waiveReason?: string | null;
}

export interface ChargeSuggestionPagedResultDto {
    items?: ChargeSuggestionDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/** POST convert gövdesi; verilmeyen alan kalemden gelir. */
export interface ConvertChargeSuggestionRequestDto {
    description?: string;
    quantity?: number;
    unitPrice?: number;
    requestId: string;
}
