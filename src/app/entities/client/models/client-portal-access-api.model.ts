/**
 * Müşteri kartı "Portal erişimi" bölümü — `GET /api/v1/clients/{id}/portal-access` ve davet yanıtı (`PORTAL_API_CONTRACT.md` §4, ADR-031).
 * Enum alanları metin döner; ekranda olduğu gibi etiketlenir (VM'e çevrilmez).
 */
export type ClientPortalLinkStatus = 'Active' | 'Closed';

/** Kapalı bağın gerekçesi (ADR-041): personel kapattı ya da hasta sahibi hesabını sildi; aktif bağda `null`. */
export type ClientPortalLinkCloseReason = 'ClinicClosed' | 'OwnerAccountDeleted';

/** `Expired`: bekleyen ama süresi geçmiş davet (sunucu hesaplar). */
export type ClientPortalInviteStatus = 'Pending' | 'Accepted' | 'Revoked' | 'Expired';

/** `canInvite: false` iken neden; metni `ownerPortalProblemUserMessage` üretir. */
export type ClientPortalInviteBlockedCode = 'OwnerPortal.ClientEmailMissing' | 'OwnerPortal.ClientOptedOut' | 'OwnerPortal.ClientNotInvitable' | 'OwnerPortal.AlreadyLinked';

export interface ClientPortalLinkDto {
    linkId: string;
    clinicId: string;
    clinicName: string | null;
    status: ClientPortalLinkStatus;
    /** Hasta sahibi hesabını sildiyse `null`. */
    accountEmail: string | null;
    linkedAtUtc: string;
    closedAtUtc: string | null;
    closeReason: ClientPortalLinkCloseReason | null;
}

export interface ClientPortalInviteDto {
    inviteId: string;
    clinicId: string;
    email: string;
    status: ClientPortalInviteStatus;
    createdAtUtc: string;
    expiresAtUtc: string;
    acceptedAtUtc: string | null;
    revokedAtUtc: string | null;
}

export interface ClientPortalAccessDto {
    clientId: string;
    /** Müşteri davet kuralına uyuyor ve aktif bağı yok. */
    canInvite: boolean;
    inviteBlockedCode: ClientPortalInviteBlockedCode | null;
    links: ClientPortalLinkDto[];
    /** Son 20 davet, en yeni önce. */
    invites: ClientPortalInviteDto[];
}
