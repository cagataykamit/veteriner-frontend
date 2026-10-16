import type { LegalDocumentVersionDto } from '@/app/features/legal-acceptance/models/legal-acceptance.model';

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
    /** Davetteki role göre yeni hesabın kabul edeceği belgeler ve güncel sürümleri (ADR-029). */
    requiredLegalDocuments?: LegalDocumentVersionDto[] | null;
}

/** POST /api/v1/public/invites/{token}/signup-and-accept */
export interface PublicInviteSignupAndAcceptRequestDto {
    password: string;
    acceptedLegalDocuments: LegalDocumentVersionDto[];
}
