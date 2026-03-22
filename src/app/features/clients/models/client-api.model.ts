/**
 * Swagger ile uyumlu ham DTO'lar (Backend Veteriner API).
 * İleride API'ye ek alan gelince burada genişletilir.
 */

export interface ClientListItemDto {
    id: string;
    tenantId: string;
    fullName?: string | null;
    phone?: string | null;
    /** Swagger sonraki sürümlerde eklenebilir — opsiyonel */
    email?: string | null;
    petCount?: number | null;
    status?: string | null;
    createdAtUtc?: string | null;
}

export interface ClientListItemDtoPagedResult {
    items?: ClientListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface ClientDetailDto {
    id: string;
    tenantId: string;
    fullName?: string | null;
    phone?: string | null;
    email?: string | null;
    notes?: string | null;
    address?: string | null;
    status?: string | null;
    createdAtUtc?: string | null;
    updatedAtUtc?: string | null;
    petsSummary?: ClientPetsSummaryDto | null;
    appointmentsSummary?: ClientAppointmentsSummaryDto | null;
}

export interface ClientPetsSummaryDto {
    totalCount?: number;
    items?: { id: string; name?: string | null }[] | null;
}

export interface ClientAppointmentsSummaryDto {
    totalCount?: number;
    upcomingCount?: number;
}
