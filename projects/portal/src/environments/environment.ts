/**
 * Hasta sahibi portalı — üretim derlemesi. Klinik panelinin ortam dosyasından bağımsızdır.
 * `portalApiBaseUrl`: portal API kökü (`PORTAL_API_CONTRACT.md` §1, sonunda `/` olmadan). Backend CORS bu origin'e izin vermeli.
 * `invitePath`: davet e-postasındaki bağlantı yolu (`{OwnerPortal:PortalBaseUrl}/invite?token=…`, sözleşme §4.2).
 * API yanıtları service worker önbelleğine alınmaz (`ngsw-config.json` → `dataGroups` boş; kişisel veri).
 */
export const environment = {
    production: true,
    portalApiBaseUrl: 'https://localhost:7173/api/portal/v1',
    invitePath: '/invite'
};
