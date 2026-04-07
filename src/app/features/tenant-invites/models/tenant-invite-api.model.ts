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
