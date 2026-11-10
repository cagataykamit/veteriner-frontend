/**
 * Production — `environment.development.ts` ile `fileReplacements` üzerinden değiştirilmez (yalnızca dev build).
 * `apiBaseUrl`: backend kök URL (sonunda `/` olmadan). CORS izin vermeli.
 */
export const environment = {
    production: true,
    apiBaseUrl: 'https://api.vetinity.com',
    /**
     * Swagger `LoginCommand.tenantId` — backend çok kiracılı ise ve zorunlu tutuyorsa tenant GUID.
     * Örnek: '3fa85f64-5717-4562-b3fc-2c963f66afa6'
     */
    authTenantId: null as string | null,
    /** Klinik sitelerinin kökü (`{siteBaseUrl}/k/{adres}`, ADR-045 K6). */
    siteBaseUrl: 'https://vetinity.com',
    /** Tanıtım sayfalarını arama motorlarına kapat (yalnız staging). */
    siteNoindex: false
};
