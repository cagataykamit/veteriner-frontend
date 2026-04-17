export interface OperationClaimOptionVm {
    id: string;
    name: string;
}

export interface TenantInviteCreatedVm {
    inviteId: string;
    token: string;
    email: string;
    tenantId: string;
    clinicId: string;
    expiresAtUtc: string | null;
}

export interface TenantInviteListItemVm {
    id: string;
    email: string;
    statusLabel: string;
    expiresAtUtc: string | null;
    clinicSummary: string;
    roleSummary: string;
}
