const SEPARATOR = ', ';

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
