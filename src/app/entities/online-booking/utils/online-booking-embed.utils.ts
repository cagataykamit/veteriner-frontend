/**
 * Kliniğin kendi sitesine koyacağı kodlar (APPT-020 düğme, APPT-021 gömme; sözleşme `ONLINE_APPOINTMENT_API_CONTRACT.md` §15).
 * İkisi de kliniğe özel bağlantıya `?kaynak=dis-site` ekler: talep Talepler'de "Dış site" kaynağıyla sayılır (TIER-016, §14).
 * Kodlar düz HTML'dir, dış betik ya da çerez yoktur. Panel önizlemesi de buradaki metin ve stili kullanır.
 */

/** Sunucunun izinli kaynak değeri (`AppointmentRequestChannels.ExternalSiteToken`). */
export const EXTERNAL_SITE_CHANNEL = 'dis-site';

/** Gömülü sayfanın yükseklik iletisinin türü (portal `portal-embed.ts` ile aynı değer, §15). */
export const EMBED_HEIGHT_MESSAGE_TYPE = 'vetinity-randevu-yukseklik';

export const BOOKING_BUTTON_TEXT = 'Online randevu al';

/** İleti gelmezse (betik silinmişse) çerçevenin sabit yüksekliği; sayfa içinde kaydırılır. */
export const EMBED_FALLBACK_HEIGHT = 900;

/**
 * Düğmenin satır içi stili: kliniğin sitesindeki stil dosyalarından bağımsız görünür. Beyaz yazı bu zeminde 4.5:1'i geçer
 * (WCAG AA); en az 44 px yükseklik dokunma hedefi içindir.
 */
export const BOOKING_BUTTON_STYLE: Readonly<Record<string, string>> = {
    display: 'inline-block',
    'min-height': '44px',
    'box-sizing': 'border-box',
    padding: '12px 24px',
    'border-radius': '8px',
    background: '#0b6b64',
    color: '#ffffff',
    font: "600 16px/20px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    'text-decoration': 'none'
};

/** HTML öznitelik değeri olarak güvenli metin. */
function attr(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineStyle(style: Readonly<Record<string, string>>): string {
    return Object.entries(style)
        .map(([key, value]) => `${key}:${value}`)
        .join(';');
}

/** Bağlantıya dış site kaynağını ekler; adresteki başka parametreler korunur. */
export function externalSiteBookingUrl(bookingUrl: string): string {
    const url = new URL(bookingUrl);

    url.searchParams.set('kaynak', EXTERNAL_SITE_CHANNEL);

    return url.toString();
}

/** APPT-020: yeni sekmede açılan randevu düğmesi. Erişilebilir ad görünen metinle başlar (WCAG 2.5.3). */
export function bookingButtonHtml(bookingUrl: string): string {
    return (
        `<a href="${attr(externalSiteBookingUrl(bookingUrl))}" target="_blank" rel="noopener" ` +
        `aria-label="${BOOKING_BUTTON_TEXT} (yeni sekmede açılır)" style="${attr(inlineStyle(BOOKING_BUTTON_STYLE))}">${BOOKING_BUTTON_TEXT}</a>`
    );
}

/**
 * APPT-021: talep formu sitenin içinde. Betik yalnız portal adresinden gelen yükseklik iletisini dinler ve çerçeveyi
 * içeriğe göre uzatır; betik çalışmazsa çerçeve sabit yükseklikte kalır.
 */
export function bookingIframeHtml(bookingUrl: string, clinicName: string): string {
    const src = externalSiteBookingUrl(bookingUrl);
    const origin = new URL(src).origin;
    const title = `${clinicName.trim() || 'Klinik'}: online randevu talebi`;

    return [
        `<iframe src="${attr(src)}" title="${attr(title)}" data-vetinity-randevu loading="lazy" style="display:block;width:100%;max-width:640px;height:${EMBED_FALLBACK_HEIGHT}px;border:0"></iframe>`,
        '<script>',
        'window.addEventListener("message", function (e) {',
        `  if (e.origin !== ${JSON.stringify(origin)} || !e.data || e.data.type !== ${JSON.stringify(EMBED_HEIGHT_MESSAGE_TYPE)}) return;`,
        '  var frames = document.querySelectorAll("iframe[data-vetinity-randevu]");',
        '  for (var i = 0; i < frames.length; i++) {',
        '    if (frames[i].contentWindow === e.source) frames[i].style.height = Math.min(Math.max(Number(e.data.height) || 0, 480), 6000) + "px";',
        '  }',
        '});',
        '</script>'
    ].join('\n');
}
