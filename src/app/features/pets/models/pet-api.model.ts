/** Ham API DTO’ları — Swagger ile uyumlu; eksik alanlar ileride genişletilebilir. */

export interface PetListItemDto {
    id: string;
    tenantId?: string;
    clientId?: string | null;
    name?: string | null;
    species?: string | null;
    breed?: string | null;
    ownerName?: string | null;
    gender?: string | null;
    birthDateUtc?: string | null;
    status?: string | null;
}

export interface PetListItemDtoPagedResult {
    items?: PetListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface PetDetailDto {
    id: string;
    tenantId?: string;
    clientId?: string | null;
    name?: string | null;
    species?: string | null;
    breed?: string | null;
    gender?: string | null;
    birthDateUtc?: string | null;
    color?: string | null;
    weight?: number | null;
    status?: string | null;
    notes?: string | null;
    ownerId?: string | null;
    ownerName?: string | null;
    ownerPhone?: string | null;
    vaccinationsSummary?: PetVaccinationsSummaryDto | null;
    examinationsSummary?: PetExaminationsSummaryDto | null;
    appointmentsSummary?: PetAppointmentsSummaryDto | null;
}

export interface PetVaccinationsSummaryDto {
    totalCount?: number;
    items?: { id: string; name?: string | null }[] | null;
}

export interface PetExaminationsSummaryDto {
    totalCount?: number;
    lastExaminedAtUtc?: string | null;
}

export interface PetAppointmentsSummaryDto {
    totalCount?: number;
    upcomingCount?: number | null;
}

/**
 * POST /pets gövdesi — camelCase (Swagger ile doğrulanmalı).
 * Opsiyonel alanlar backend’de yoksa mapper’da çıkarılabilir.
 */
export interface PetCreateRequestDto {
    clientId: string;
    name: string;
    species: string;
    breed?: string | null;
    gender?: string | null;
    birthDateUtc?: string | null;
    color?: string | null;
    weight?: number | null;
    status?: string | null;
    notes?: string | null;
}
