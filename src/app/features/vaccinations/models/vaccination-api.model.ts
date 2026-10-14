/**
 * Backend Veteriner API — aşı listesi DTO’ları.
 * Şema farklıysa bu dosya ve mapper ince ayarlanır.
 */

export interface VaccinationListItemDto {
    id: string;
    /** Reports endpointleri bu alias ile dönebilir. */
    vaccinationId?: string | null;
    tenantId?: string | null;
    petId?: string | null;
    petName?: string | null;
    clientName?: string | null;
    clientId?: string | null;
    clinicId?: string | null;
    examinationId?: string | null;
    vaccineDefinitionId?: string | null;
    vaccineName?: string | null;
    appliedAtUtc?: string | null;
    dueAtUtc?: string | null;
    /** Bazı list yanıtlarında sonraki doz tarihi bu adla gelir. */
    nextDueAtUtc?: string | null;
    /** Reports contract — backend status kuralına göre belirlenmiş tarih. */
    effectiveReportDateUtc?: string | null;
    status?: number | null;
    notes?: string | null;
    /** Stoktan düşen bağlı uygulama; bağlı değilse `null` (`ADMINISTRATIONS_API_CONTRACT.md` §9). */
    administrationId?: string | null;
}

export interface VaccinationListItemDtoPagedResult {
    items?: VaccinationListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/**
 * GET /vaccinations/{id}
 * Beklenen çekirdek: id, clinicId?, clientId, clientName?, petId, petName?, vaccineDefinitionId?, vaccineName (snapshot), status,
 * appliedAtUtc, dueAtUtc (liste: nextDueAtUtc), notes, examinationId?
 */
export interface VaccinationDetailDto {
    id: string;
    tenantId?: string | null;
    petId: string;
    petName?: string | null;
    clientName?: string | null;
    clientId: string;
    clinicId?: string | null;
    examinationId?: string | null;
    vaccineDefinitionId?: string | null;
    vaccineName: string;
    appliedAtUtc?: string | null;
    dueAtUtc?: string | null;
    status: number;
    notes?: string | null;
    createdAtUtc?: string | null;
    updatedAtUtc?: string | null;
    /** Bağlı uygulama ve düşülen ürün/parti; bağlı değilse hepsi `null`. */
    administrationId?: string | null;
    productId?: string | null;
    productName?: string | null;
    quantity?: number | null;
    unit?: string | null;
    batchId?: string | null;
    lotNumber?: string | null;
    expiryDate?: string | null;
}

/**
 * POST /vaccinations body — camelCase.
 * `vaccineDefinitionId` zorunlu; `vaccineName` gönderilmez (sunucu snapshot doldurur).
 */
export interface VaccinationCreateRequestDto {
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    vaccineDefinitionId: string;
    status: number;
    appliedAtUtc?: string | null;
    dueAtUtc?: string | null;
    notes?: string | null;
    /** Verilirse aynı işlemde stoktan düşen uygulama yazılır (yalnız `Applied`). */
    productId?: string;
    quantity?: number;
    batchId?: string;
    requestId?: string;
}

export interface VaccinationUpdateRequestDto {
    id?: string;
    clinicId: string;
    petId: string;
    examinationId?: string | null;
    vaccineDefinitionId: string;
    status: number;
    appliedAtUtc?: string | null;
    dueAtUtc?: string | null;
    notes?: string | null;
}
