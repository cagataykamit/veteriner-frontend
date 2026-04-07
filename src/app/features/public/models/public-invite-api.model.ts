/** GET /api/v1/public/invites/{token} */
export interface PublicInviteDetailsDto {
    inviteToken?: string | null;
    tenantName?: string | null;
    clinicName?: string | null;
    email?: string | null;
    expiresAtUtc?: string | null;
    isExpired?: boolean | null;
    canJoin?: boolean | null;
    requiresLogin?: boolean | null;
    requiresSignup?: boolean | null;
}

/** POST /api/v1/public/invites/{token}/signup-and-accept */
export interface PublicInviteSignupAndAcceptRequestDto {
    password: string;
}
