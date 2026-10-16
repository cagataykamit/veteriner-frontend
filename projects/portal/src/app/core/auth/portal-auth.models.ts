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
