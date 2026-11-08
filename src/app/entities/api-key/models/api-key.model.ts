/** Dış API anahtar kapsamı (`EXTERNAL_API_CONTRACT.md` §3); yalnız okuma. Liste sunucudan (`availableScopes`) gelir. */
export type ApiKeyScope = 'clients:read' | 'pets:read' | 'appointments:read' | 'vaccinations:read';

/** Panel listesi satırı (§6); gizli kısım ve özet hiçbir yanıtta yoktur. */
export interface ApiKeyDto {
    readonly id: string;
    readonly name: string;
    readonly prefix: string;
    readonly scopes: readonly string[];
    readonly createdByUserId: string;
    readonly createdByName: string | null;
    readonly createdAtUtc: string;
    readonly lastUsedAtUtc: string | null;
    readonly isRevoked: boolean;
    readonly revokedAtUtc: string | null;
    readonly revokedByName: string | null;
}

export interface ApiKeyListDto {
    readonly items: readonly ApiKeyDto[];
    readonly availableScopes: readonly string[];
    readonly maxActiveKeys: number;
}

/** Oluşturma yanıtı: `plainTextKey` yalnız burada ve bir kez döner. */
export interface CreatedApiKeyDto {
    readonly key: ApiKeyDto;
    readonly plainTextKey: string;
}
