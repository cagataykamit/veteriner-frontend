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
    address?: string | null;
    createdAtUtc?: string | null;
    updatedAtUtc?: string | null;
}

/**
 * POST /clients gövdesi — camelCase (Swagger ile doğrulanmalı).
 * Opsiyonel alanlar backend’de yoksa mapper’dan çıkarılabilir.
 */
export interface ClientUpsertRequestDto {
    fullName: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
}
