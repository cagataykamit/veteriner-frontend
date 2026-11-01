/** `PortalAuthTokensDto` (sözleşme §5.1). */
export interface PortalAuthTokens {
    readonly accessToken: string;
    readonly accessTokenExpiresAtUtc: string;
    readonly refreshToken: string;
    readonly refreshTokenExpiresAtUtc: string;
}

/** `GET /me` bağ öğesi (§5.8): yalnız aktif bağlar. */
export interface PortalLink {
    readonly linkId: string;
    readonly clinicId: string;
    readonly clinicName: string;
    readonly clientFullName: string;
    /** `false` → klinik portalı geçici olarak kapattı; bağ listede kalır, bağ kapsamlı uçlar 404 döner (§12). */
    readonly isClinicPortalEnabled: boolean;
}

/** Klinik portalı kapattı mı (§12). Alan gelmezse açık sayılır (sunucuda kayıt yoksa açık). */
export function isClinicPortalClosed(link: PortalLink | null | undefined): boolean {
    return link?.isClinicPortalEnabled === false;
}

/** `GET /me` (§5.8). */
export interface PortalMe {
    readonly id: string;
    readonly email: string;
    readonly displayName: string;
    readonly hasPassword: boolean;
    readonly links: readonly PortalLink[];
}

/** Oturum durumu: `offline` = yenileme anahtarı var ama sunucuya ulaşılamadı (anahtar silinmez). */
export type PortalSessionStatus = 'unknown' | 'authenticated' | 'anonymous' | 'offline';
