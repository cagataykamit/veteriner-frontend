/**
 * `ng serve` — `angular.json` → `proxyConfig: proxy.conf.json`.
 * `apiBaseUrl: ''` iken göreli path’ler (`/api/v1/...`) tarayıcıda aynı origin’e gider; proxy 7173’e yollar.
 */
export const environment = {
    production: false,
    apiBaseUrl: '',
    /**
     * Giriş 401 dönüyorsa: backend tenant bekliyor olabilir — kendi tenant GUID’inizi yazın.
     * Swagger: LoginCommand.tenantId
     */
    authTenantId: null as string | null,
    /** Klinik sitelerinin kökü (`{siteBaseUrl}/k/{adres}`, ADR-045 K6). */
    siteBaseUrl: 'http://localhost:4400',
    /** Tanıtım sayfalarını arama motorlarına kapat (yalnız staging). */
    siteNoindex: false
};
