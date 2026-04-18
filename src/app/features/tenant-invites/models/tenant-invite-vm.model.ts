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
    /** Ham durum metni (lifecycle türetimi için). */
    statusRaw: string | null;
    expiresAtUtc: string | null;
    clinicSummary: string;
    roleSummary: string;
    canCancel: boolean;
    canResend: boolean;
}

/** GET tek davet — salt okunur detay. */
export interface TenantInviteDetailVm {
    id: string;
    email: string;
    statusLabel: string;
    statusRaw: string | null;
    expiresAtUtc: string | null;
    createdAtUtc: string | null;
    clinicId: string | null;
    clinicName: string | null;
    operationClaimId: string | null;
    operationClaimName: string | null;
    /** Davet bağlantısı üretmek için; yoksa null. */
    token: string | null;
    tenantId: string | null;
    canCancel: boolean;
    canResend: boolean;
}
