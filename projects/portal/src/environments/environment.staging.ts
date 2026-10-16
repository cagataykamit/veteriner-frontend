/**
 * Hasta sahibi portalı — staging derlemesi (`ng build portal --configuration staging`). Adresler ADR-033 staging satırı;
 * `api-staging` adresi panelin staging ortam dosyasıyla aynı (ADR-033: "doğrulanacak"). Alanların anlamı `environment.ts`'te.
 */
export const environment = {
    production: true,
    portalApiBaseUrl: 'https://api-staging.vetinity.com/api/portal/v1',
    portalBaseUrl: 'https://portal-staging.vetinity.com',
    invitePath: '/invite'
};
