/**
 * Aramada bulunamayan metni hızlı müşteri formuna taşır (APPT-017/019): telefon gibi görünüyorsa telefon alanına, aksi hâlde ad soyada.
 * Aynı bilgi ikinci kez yazılmaz; kullanıcı formda düzeltebilir.
 */
export function quickClientPrefill(searchText: string | null | undefined): { fullName: string; phone: string } {
    const text = (searchText ?? '').trim();
    const digits = text.replace(/\D/g, '');
    const looksLikePhone = text.length > 0 && /^[\d\s+()-]+$/.test(text) && digits.length >= 7;

    return looksLikePhone ? { fullName: '', phone: text } : { fullName: text, phone: '' };
}
