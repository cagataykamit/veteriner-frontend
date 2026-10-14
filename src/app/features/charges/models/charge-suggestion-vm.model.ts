export interface ChargeSuggestionVm {
    id: string;
    sourceType: string;
    sourceId: string;
    clientId: string;
    clientName: string;
    petId: string;
    petName: string;
    examinationId: string | null;
    visitId: string | null;
    description: string;
    quantity: number;
    unit: string;
    /** `null`: kalemde katalog fiyatı yok, resepsiyon girer. */
    suggestedUnitPrice: number | null;
    currency: string;
    occurredAtUtc: string;
}

export interface ChargeSuggestionsPagedVm {
    items: ChargeSuggestionVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/** GET /charge-suggestions sorgusu; yalnız bekleyen kalemler gelir. Tarih süzgeci sözleşmede yoktur; süzgeçler AND. */
export interface ChargeSuggestionsListQuery {
    page?: number;
    pageSize?: number;
    /** Müşterinin bugünkü bütün hayvanlarının kalemleri (hayvan sahipliği üzerinden; `PET_STATUS_CLIENT_CONTACT_API_CONTRACT.md` §3). */
    clientId?: string;
    petId?: string;
    examinationId?: string;
    visitId?: string;
}

/** Boş gövde = kalemdeki değerlerle tek tık; yalnız düzenlenen alanlar dolu gönderilir. */
export interface ConvertChargeSuggestionRequest {
    description?: string;
    quantity?: number;
    unitPrice?: number;
    /** Çevirme denemesi başına üretilir; aynı anahtarla tekrar istek ikinci ücret üretmez. */
    requestId: string;
}
