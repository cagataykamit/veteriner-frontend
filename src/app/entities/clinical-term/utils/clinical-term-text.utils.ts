import { turkishTextKey } from '@/app/shared/utils/turkish-text-key.utils';

const SEPARATOR = ', ';

/**
 * Mükerrer ad anahtarı (`turkishTextKey`). Mükerrer kararını sunucu verir (`409 DuplicateName`); bu anahtar yalnız
 * çakışan kaydı, kelime içeren arama sonuçları arasından seçmek içindir.
 */
export function clinicalTermNameKey(name: string): string {
    return turkishTextKey(name);
}

/**
 * Arama boş dönünce benzer terimleri bulmak için kök: Türkçe küçük harf, son üç harf atılır, en az dört harf kalır
 * ("topallama" → "topall", "Topallık"ı bulur). Beş harften kısa aramada kök aranmaz (çok geniş sonuç verir).
 */
export function clinicalTermSearchStem(query: string): string | null {
    const term = query.trim().toLocaleLowerCase('tr');

    if (term.length < 5) {
        return null;
    }

    return term.slice(0, Math.max(4, term.length - 3));
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
