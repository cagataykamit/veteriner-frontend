export interface PublicInviteVm {
    inviteToken: string;
    tenantName: string;
    clinicName: string;
    email: string;
    expiresAtUtc: string | null;
    isExpired: boolean;
    canJoin: boolean;
    requiresLogin: boolean;
    requiresSignup: boolean;
}
