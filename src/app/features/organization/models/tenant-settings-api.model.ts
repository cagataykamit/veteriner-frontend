/**
 * PUT `/api/v1/tenants/{tenantId}/settings` — Faz 5B kiracı paneli.
 * Backend model alanı: `Name` → JSON `name`.
 */
export interface TenantSettingsUpdateRequestDto {
    readonly name: string;
}
