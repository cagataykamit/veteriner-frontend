/** Vetinity destek hattı: panel menüsündeki WhatsApp destek bağlantısı numarayı ve hazır mesajı buradan alır. */
export const VETINITY_SUPPORT_PHONE_DISPLAY = '0543 958 00 91';

/** `wa.me` biçimi: ülke koduyla, başında `+` ve `0` olmadan. */
export const VETINITY_SUPPORT_WHATSAPP_NUMBER = '905439580091';

/** Destek sohbetini hazır mesajla açan `wa.me` bağlantısı; klinik adı yoksa mesaj yalnız ilk cümledir. */
export function supportWhatsAppUrl(clinicName?: string | null): string {
    const greeting = 'Merhaba, Vetinity panelinden yazıyorum.';
    const clinic = clinicName?.trim();
    const text = clinic ? `${greeting} Klinik: ${clinic}` : greeting;

    return `https://wa.me/${VETINITY_SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
