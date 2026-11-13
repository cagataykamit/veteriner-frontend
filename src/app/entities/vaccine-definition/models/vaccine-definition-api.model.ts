/**
 * GET /api/v1/vaccine-definitions — ham DTO.
 */

export interface VaccineDefinitionDto {
    id: string;
    tenantId?: string | null;
    speciesId?: string | null;
    name: string;
    code: string;
    description?: string | null;
    defaultNextDueDays?: number | null;
    /** Sistem satırı kilidi (klinik değiştiremez); klinik sınıf için `category`. */
    isCore: boolean;
    isActive: boolean;
    /** WSAVA sınıfı ya da antiparaziter; eski yanıtta ve sınıfsız tanımda yok. */
    category?: string | null;
}

export interface VaccineDefinitionDtoPagedResult {
    items?: VaccineDefinitionDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}
