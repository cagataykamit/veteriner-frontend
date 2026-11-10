/** Vetinity destek hattı: panel menüsündeki WhatsApp destek bağlantısı ve tanıtım sitesinin iletişim sayfası numarayı buradan alır. */
export const VETINITY_SUPPORT_PHONE_DISPLAY = '0543 958 00 91';

/** `wa.me` biçimi: ülke koduyla, başında `+` ve `0` olmadan. */
export const VETINITY_SUPPORT_WHATSAPP_NUMBER = '905439580091';

/** Hazır mesajsız sohbet bağlantısı (tanıtım sitesi). */
export const VETINITY_SUPPORT_WHATSAPP_URL = `https://wa.me/${VETINITY_SUPPORT_WHATSAPP_NUMBER}`;

/** Destek sohbetini hazır mesajla açan `wa.me` bağlantısı; klinik adı yoksa mesaj yalnız ilk cümledir. */
export function supportWhatsAppUrl(clinicName?: string | null): string {
    const greeting = 'Merhaba, Vetinity panelinden yazıyorum.';
    const clinic = clinicName?.trim();
    const text = clinic ? `${greeting} Klinik: ${clinic}` : greeting;

    return `${VETINITY_SUPPORT_WHATSAPP_URL}?text=${encodeURIComponent(text)}`;
}
