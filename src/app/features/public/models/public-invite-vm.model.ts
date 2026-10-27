import type { LegalDocumentVersionDto } from '@/app/entities/legal-document/models/legal-acceptance.model';

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
    /** Yeni hesap kaydında onaylanacak belgeler (sunucudan; boşsa kutu gösterilmez). */
    requiredLegalDocuments: LegalDocumentVersionDto[];
}
