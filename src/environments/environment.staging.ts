/**
 * Staging — `ng build --configuration staging` ile kullanılır.
 * `apiBaseUrl`: staging backend kök URL (sonunda `/` olmadan). CORS izin vermeli.
 */
export const environment = {
    production: true,
    apiBaseUrl: 'https://api-staging.vetinity.com',
    /**
     * Swagger `LoginCommand.tenantId` — backend çok kiracılı ise ve zorunlu tutuyorsa tenant GUID.
     * Örnek: '3fa85f64-5717-4562-b3fc-2c963f66afa6'
     */
    authTenantId: null as string | null
};
