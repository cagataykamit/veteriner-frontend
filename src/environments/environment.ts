/** Production build — API kökünü dağıtım ortamınıza göre güncelleyin. */
export const environment = {
    production: true,
    /** Doğrudan backend kökü (CORS açık olmalı). Geliştirmede proxy kullanıldığı için boş bırakılır. */
    apiBaseUrl: 'https://localhost:7173',
    /**
     * Swagger `LoginCommand.tenantId` — backend çok kiracılı ise ve zorunlu tutuyorsa tenant GUID.
     * Örnek: '3fa85f64-5717-4562-b3fc-2c963f66afa6'
     */
    authTenantId: null as string | null
};
