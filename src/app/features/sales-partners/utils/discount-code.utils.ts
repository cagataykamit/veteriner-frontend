/**
 * Satış ortağı kodu yardımcıları (ADR-037, `SALES_PARTNER_DISCOUNT_API_CONTRACT.md`). Kural sunucudadır; burada yalnız
 * yazım kolaylığı (büyük harf, boşluksuz, Türkçe harf) ve kayıt akışına taşıma vardır. Çerez/localStorage kullanılmaz:
 * kod yalnız URL ve oturum belleğinde (sessionStorage) taşınır.
 */

/** Oturum belleği anahtarı: `/r/:kod` ile gelen kod kayıt sayfasına taşınır. */
export const PENDING_DISCOUNT_CODE_KEY = 'vetinity.pendingDiscountCode';

/** Kayıt sayfasında kodu taşıyan sorgu parametresi. */
export const DISCOUNT_CODE_QUERY_PARAM = 'kod';

/** Geçersiz kodda her durumda aynı metin (numaralandırmaya karşı sunucu da tek tip yanıt verir). */
export const DISCOUNT_CODE_INVALID_MESSAGE = 'Ortak kodu geçersiz.';

const MAX_LENGTH = 32;

const TURKISH_MAP: Record<string, string> = { ı: 'I', i: 'I', İ: 'I', ş: 'S', Ş: 'S', ğ: 'G', Ğ: 'G', ü: 'U', Ü: 'U', ö: 'O', Ö: 'O', ç: 'C', Ç: 'C' };

/** Sunucudaki normalizasyonun görünür eşi: boşluk atılır, Türkçe harf ASCII'ye iner, büyük harf; biçim denetimi sunucudadır. */
export function normalizeDiscountCodeInput(raw: string | null | undefined): string {
    return Array.from((raw ?? '').replace(/\s+/g, ''))
        .map((ch) => TURKISH_MAP[ch] ?? ch.toUpperCase())
        .join('')
        .slice(0, MAX_LENGTH);
}

/** Müşteriye gösterilen indirim notu. */
export function discountNoteText(discountPercent: number, discountMonths: number): string {
    return `%${formatPercent(discountPercent)} indirim, ilk ${discountMonths} ay`;
}

export function formatPercent(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
}

/** `/r/:kod` ile gelen kodu oturum belleğine yazar; erişilemezse sessizce geçer (URL parametresi yeterli). */
export function storePendingDiscountCode(code: string): void {
    try {
        sessionStorage.setItem(PENDING_DISCOUNT_CODE_KEY, code);
    } catch {
        // Gizli pencere vb.: kod URL'de taşınır.
    }
}

export function readPendingDiscountCode(): string | null {
    try {
        return sessionStorage.getItem(PENDING_DISCOUNT_CODE_KEY);
    } catch {
        return null;
    }
}

export function clearPendingDiscountCode(): void {
    try {
        sessionStorage.removeItem(PENDING_DISCOUNT_CODE_KEY);
    } catch {
        // yok say
    }
}
