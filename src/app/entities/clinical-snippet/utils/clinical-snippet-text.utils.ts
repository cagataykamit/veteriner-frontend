import { CLINICAL_SNIPPET_SHORTCUT_MAX, type ClinicalSnippetDto } from '@/app/entities/clinical-snippet/models/clinical-snippet.model';
import { turkishTextKey } from '@/app/shared/utils/turkish-text-key.utils';

/** Belirteç karakteri: harf (Türkçe dahil), rakam veya tire; kısayol yazılırken `#`'tan sonra gelenler. */
const TOKEN_CHAR = /[\p{L}\p{N}-]/u;
const SHORTCUT_PATTERN = /^[a-z0-9-]+$/;

/** `#` ile imleç arasındaki yazılan sorgu ve değiştirilecek aralık (`start` = `#`, `end` = belirtecin sonu). */
export interface SnippetToken {
    start: number;
    end: number;
    query: string;
}

/**
 * Sunucunun kısayol normalleştirmesinin istemci karşılığı (sözleşme §1): baştaki `#` atılır, Türkçe harfler katlanır ve
 * küçültülür (`#İshal` → `ishal`). Kaydedilen değeri sunucu belirler; bu yalnız düzenleyicide erken uyarı ve gösterim içindir.
 */
export function normalizeSnippetShortcut(raw: string): string {
    return turkishTextKey(raw.trim().replace(/^#+/, ''));
}

/** Normalleşmiş kısayolun biçimi: 2–30 karakter, yalnız `a-z`, `0-9`, `-`. */
export function isValidSnippetShortcut(normalized: string): boolean {
    return normalized.length >= 2 && normalized.length <= CLINICAL_SNIPPET_SHORTCUT_MAX && SHORTCUT_PATTERN.test(normalized);
}

/**
 * İmleçten geriye `#` + harf/rakam/tire belirtecini bulur (sözleşme §9). `#` metnin/satırın başında ya da boşluktan sonra
 * değilse (ör. `C#`, `no#3`) tetiklenmez. İmleçten sonra bitişik belirteç karakterleri de değiştirilecek aralığa girer
 * (kelimenin ortasında seçilirse artık parça kalmasın).
 */
export function findSnippetToken(text: string, caret: number): SnippetToken | null {
    if (caret < 1 || caret > text.length) {
        return null;
    }

    let hash = caret - 1;

    while (hash >= 0 && caret - hash <= CLINICAL_SNIPPET_SHORTCUT_MAX + 1 && TOKEN_CHAR.test(text[hash])) {
        hash--;
    }

    if (hash < 0 || text[hash] !== '#' || (hash > 0 && !/\s/.test(text[hash - 1]))) {
        return null;
    }

    let end = caret;

    while (end < text.length && TOKEN_CHAR.test(text[end])) {
        end++;
    }

    return { start: hash, end, query: text.slice(hash + 1, caret) };
}

/**
 * Sorguya uyan parçalar (Türkçe duyarsız): kısayolu sorguyla başlayanlar önce, sonra kısayolunda veya başlığında sorguyu
 * içerenler; her grupta gelen sıra korunur (sunucu kısayola göre sıralar). Boş sorgu (yalnız `#`) ilk `limit` parçayı verir.
 */
export function filterSnippets(snippets: readonly ClinicalSnippetDto[], query: string, limit: number): ClinicalSnippetDto[] {
    const key = turkishTextKey(query);

    if (!key) {
        return snippets.slice(0, limit);
    }

    const starts: ClinicalSnippetDto[] = [];
    const contains: ClinicalSnippetDto[] = [];

    for (const s of snippets) {
        const shortcut = turkishTextKey(s.shortcut);

        if (shortcut.startsWith(key)) {
            starts.push(s);
        } else if (shortcut.includes(key) || turkishTextKey(s.title).includes(key)) {
            contains.push(s);
        }
    }

    return [...starts, ...contains].slice(0, limit);
}

/** Belirteci (`#sorgu`) parça metniyle değiştirir; yeni imleç eklenen metnin sonundadır. */
export function replaceSnippetToken(text: string, token: SnippetToken, body: string): { text: string; caret: number } {
    return {
        text: text.slice(0, token.start) + body + text.slice(token.end),
        caret: token.start + body.length
    };
}
