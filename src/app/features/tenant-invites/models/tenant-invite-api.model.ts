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
    /**
     * `TenantInviteStatus` enum sayısı (JsonStringEnumConverter yok): `0` Pending, `1` Accepted, `2` Revoked.
     * UI etiketi `tenant-invite-status.utils` + mapper ile üretilir.
     */
    status?: string | null;
    state?: string | null;
    /** `Pending` (0) iken `true` ise süre dolmuş kabul edilir; ayrı bir enum değeri değildir. */
    isExpired?: boolean | null;
    expiresAtUtc?: string | null;
    createdAtUtc?: string | null;
    clinicId?: string | null;
    clinicName?: string | null;
    operationClaimId?: string | null;
    operationClaimName?: string | null;
    /** Backend gönderirse öncelikli aksiyon bayrakları. */
    canCancel?: boolean | null;
    canResend?: boolean | null;
    /** Sunucu kurallı davet aksiyonları (varsa `canCancel` / `canResend` üzerinde önceliklidir). */
    canCancelInvite?: boolean | null;
    canResendInvite?: boolean | null;
}

export interface TenantInviteListItemDtoPagedResult {
    items?: TenantInviteListItemDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}
