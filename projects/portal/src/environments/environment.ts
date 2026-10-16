/**
 * Hasta sahibi portalı — üretim derlemesi. Klinik panelinin ortam dosyasından bağımsızdır.
 * `portalApiBaseUrl`: portal API kökü (`PORTAL_API_CONTRACT.md` §1, sonunda `/` olmadan). Backend CORS bu origin'e izin vermeli.
 * `invitePath`: davet e-postasındaki bağlantı yolu (`{OwnerPortal:PortalBaseUrl}/invite?token=…`, sözleşme §4.2).
 * `portalBaseUrl`: portalın yayın adresi (ADR-033; backend `OwnerPortal:PortalBaseUrl` ile aynı). Mobil pakette derin
 * bağlantının (App Links / Universal Links) kabul edildiği tek origin ve `capacitor.config.ts` izinli gezinme kaynağı.
 * API yanıtları service worker önbelleğine alınmaz (`ngsw-config.json` → `dataGroups` boş; kişisel veri).
 */
export const environment = {
    production: true,
    portalApiBaseUrl: 'https://localhost:7173/api/portal/v1',
    portalBaseUrl: 'https://portal.vetinity.com',
    invitePath: '/invite'
};
