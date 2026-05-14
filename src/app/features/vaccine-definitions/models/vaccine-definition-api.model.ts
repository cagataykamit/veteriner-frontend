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
    isCore: boolean;
    isActive: boolean;
}

export interface VaccineDefinitionDtoPagedResult {
    items?: VaccineDefinitionDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}
