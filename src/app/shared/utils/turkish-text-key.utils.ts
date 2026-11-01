const TURKISH_FOLD: Record<string, string> = { ı: 'i', ç: 'c', ğ: 'g', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };

/**
 * Sunucunun Türkçe duyarsız karşılaştırma anahtarının (`TurkishTextKey`) istemci karşılığı: büyük/küçük harf, `I/ı/İ/i`,
 * `ç/ğ/ö/ş/ü`, `â/î/û` farkı ve fazla boşluk yok sayılır. Eşleşme/mükerrer kararı sunucudadır; bu anahtar istemcide
 * süzme ve seçim içindir.
 */
export function turkishTextKey(text: string): string {
    return text
        .trim()
        .replace(/\s+/g, ' ')
        .toLocaleLowerCase('tr')
        .replace(/[ıçğöşüâîû]/g, (c) => TURKISH_FOLD[c]);
}
