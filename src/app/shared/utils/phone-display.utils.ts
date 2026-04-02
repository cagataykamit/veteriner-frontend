/**
 * Müşteri telefonu UI gösterimi (Türkiye cep).
 * Saklama / API / form submit değerini değiştirmez; yalnızca okunabilir string üretir.
 */

/** Mapper ile uyumlu boş gösterim (em dash). */
export const CLIENT_PHONE_DISPLAY_PLACEHOLDER = '—';

/**
 * TR cep numarası için +90 5XX XXX XX XX.
 * Tanınmayan biçimde ham metni (trim) olduğu gibi döndürür.
 */
export function formatClientPhoneForDisplay(value: string | null | undefined): string {
    const t = (value ?? '').trim();
    if (!t || t === CLIENT_PHONE_DISPLAY_PLACEHOLDER) {
        return CLIENT_PHONE_DISPLAY_PLACEHOLDER;
    }
    const d = t.replace(/\D/g, '');
    const national = toTurkishMobileNational10(d);
    if (!national) {
        return t;
    }
    return `+90 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6, 8)} ${national.slice(8, 10)}`;
}

/**
 * Yerel 10 hane (5XXXXXXXXX) — `client-create-phone` ile aynı kabul kuralları.
 */
function toTurkishMobileNational10(digits: string): string | null {
    if (digits.length === 10 && digits.startsWith('5')) {
        return digits;
    }
    if (digits.length === 11 && digits.startsWith('05')) {
        return digits.slice(1);
    }
    if (digits.length === 12 && digits.startsWith('90') && digits[2] === '5') {
        return digits.slice(2);
    }
    return null;
}
