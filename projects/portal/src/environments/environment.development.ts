/**
 * `ng serve portal` (port 4300). Göreli kök: istekler aynı origin'e gider, `projects/portal/proxy.conf.json`
 * yalnız `/api/portal` yolunu https://localhost:7173'e iletir (backend geliştirme CORS'u yalnız 4200'e açık;
 * proxy ayrıca personel uçlarını portal origin'inden erişilmez kılar).
 */
export const environment = {
    production: false,
    portalApiBaseUrl: '/api/portal/v1',
    invitePath: '/invite'
};
