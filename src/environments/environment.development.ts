/** `ng serve` + proxy: istekler `/api/...` üzerinden 7173’e yönlendirilir. */
export const environment = {
    production: false,
    apiBaseUrl: '',
    /**
     * Giriş 401 dönüyorsa: backend tenant bekliyor olabilir — kendi tenant GUID’inizi yazın.
     * Swagger: LoginCommand.tenantId
     */
    authTenantId: null as string | null
};
