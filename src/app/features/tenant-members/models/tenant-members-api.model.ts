/** Kiracı üyesi liste satırı — backend şemasıyla hizalı; ek anahtarlar mapper’da okunur. */
export interface TenantMemberListItemDto {
    id: string;
    email?: string | null;
    emailConfirmed?: boolean | null;
    /** Alternatif anahtarlar için mapper fallback. */
    isEmailConfirmed?: boolean | null;
    createdAtUtc?: string | null;
}

export interface TenantMemberListItemDtoPagedResult {
    items?: TenantMemberListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}
