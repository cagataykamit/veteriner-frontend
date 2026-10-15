const SEPARATOR = ', ';

const TURKISH_FOLD: Record<string, string> = { ı: 'i', ç: 'c', ğ: 'g', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };

/**
 * Sunucunun mükerrer ad anahtarının (`TurkishTextKey`) istemci karşılığı: büyük/küçük harf, `I/ı/İ/i`, `ç/ğ/ö/ş/ü`,
 * `â/î/û` farkı ve fazla boşluk yok sayılır. Mükerrer kararını sunucu verir (`409 DuplicateName`); bu anahtar yalnız
 * çakışan kaydı, kelime içeren arama sonuçları arasından seçmek içindir.
 */
export function clinicalTermNameKey(name: string): string {
    return name
        .trim()
        .replace(/\s+/g, ' ')
        .toLocaleLowerCase('tr')
        .replace(/[ıçğöşüâîû]/g, (c) => TURKISH_FOLD[c]);
}

/**
 * Sözlükten seçilen adı serbest metin alanına ekler (muayene şeması değişmez; sözleşme: seçilen `name` alana yazılır).
 * Boş alana adın kendisi yazılır; doluysa sona `", "` ile eklenir. Ad metinde zaten ayrı bir parça olarak varsa
 * (virgül, noktalı virgül veya satır sonuyla ayrılmış; Türkçe büyük/küçük harf duyarsız) metin değişmez.
 */
export function appendClinicalTermToText(text: string, name: string): string {
    const term = name.trim();

    if (!term) {
        return text;
    }

    const body = text.trimEnd();

    if (!body) {
        return term;
    }

    const key = term.toLocaleLowerCase('tr');

    if (body.split(/[,;\n]/).some((part) => part.trim().toLocaleLowerCase('tr') === key)) {
        return text;
    }

    return /[,;]$/.test(body) ? `${body} ${term}` : `${body}${SEPARATOR}${term}`;
}
