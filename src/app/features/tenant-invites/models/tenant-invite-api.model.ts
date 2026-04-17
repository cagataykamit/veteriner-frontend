export interface TenantInviteCreateRequestDto {
    email: string;
    clinicId: string;
    operationClaimId: string;
    expiresAtUtc?: string | null;
}

export interface TenantInviteCreatedDto {
    inviteId?: string | null;
    token?: string | null;
    email?: string | null;
    tenantId?: string | null;
    clinicId?: string | null;
    expiresAtUtc?: string | null;
}

/** Davet liste satırı — backend şeması; ek alanlar mapper’da okunur. */
export interface TenantInviteListItemDto {
    id?: string | null;
    inviteId?: string | null;
    email?: string | null;
    status?: string | null;
    state?: string | null;
    expiresAtUtc?: string | null;
    clinicId?: string | null;
    clinicName?: string | null;
    operationClaimId?: string | null;
    operationClaimName?: string | null;
}

export interface TenantInviteListItemDtoPagedResult {
    items?: TenantInviteListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}
