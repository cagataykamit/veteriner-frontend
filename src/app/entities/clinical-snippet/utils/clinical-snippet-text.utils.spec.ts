import type { ClinicalSnippetDto } from '@/app/entities/clinical-snippet/models/clinical-snippet.model';
import { filterSnippets, findSnippetToken, isValidSnippetShortcut, normalizeSnippetShortcut, replaceSnippetToken } from './clinical-snippet-text.utils';

const snippet = (shortcut: string, title: string): ClinicalSnippetDto => ({
    id: shortcut,
    shortcut,
    title,
    body: `${title} metni`,
    isActive: true,
    createdAtUtc: '2026-11-01T10:00:00Z',
    updatedAtUtc: null,
    rowVersion: 'AA=='
});

describe('normalizeSnippetShortcut / isValidSnippetShortcut', () => {
    it('baştaki # atılır, Türkçe harfler katlanır ve küçültülür', () => {
        expect(normalizeSnippetShortcut(' #İshal ')).toBe('ishal');
        expect(normalizeSnippetShortcut('KUŞMA-2')).toBe('kusma-2');
        expect(normalizeSnippetShortcut('##göz')).toBe('goz');
    });

    it('2–30 karakter, yalnız a-z 0-9 -', () => {
        expect(isValidSnippetShortcut('ishal')).toBe(true);
        expect(isValidSnippetShortcut('k1-a')).toBe(true);
        expect(isValidSnippetShortcut('k')).toBe(false);
        expect(isValidSnippetShortcut('a'.repeat(31))).toBe(false);
        expect(isValidSnippetShortcut('kan ishal')).toBe(false);
        expect(isValidSnippetShortcut('ishal!')).toBe(false);
    });
});

describe('findSnippetToken', () => {
    it('metnin/satırın başında ve boşluktan sonra # belirtecini bulur', () => {
        expect(findSnippetToken('#kus', 4)).toEqual({ start: 0, end: 4, query: 'kus' });
        expect(findSnippetToken('Öykü: #kus', 10)).toEqual({ start: 6, end: 10, query: 'kus' });
        expect(findSnippetToken('a\n#İs', 5)).toEqual({ start: 2, end: 5, query: 'İs' });
        expect(findSnippetToken('x #', 3)).toEqual({ start: 2, end: 3, query: '' });
    });

    it('# öncesinde harf/rakam veya başka işaret varsa tetiklenmez', () => {
        expect(findSnippetToken('C#', 2)).toBeNull();
        expect(findSnippetToken('no#3', 4)).toBeNull();
        expect(findSnippetToken('(#kus', 5)).toBeNull();
        expect(findSnippetToken('##kus', 5)).toBeNull();
    });

    it('belirteç imleçle bitişik değilse veya # yoksa tetiklenmez', () => {
        expect(findSnippetToken('#kus ', 5)).toBeNull();
        expect(findSnippetToken('kusma', 5)).toBeNull();
        expect(findSnippetToken('', 0)).toBeNull();
        expect(findSnippetToken(`#${'a'.repeat(40)}`, 41)).toBeNull();
    });

    it('imleçten sonra bitişik belirteç karakterleri değiştirilecek aralığa girer; sorgu imlece kadardır', () => {
        expect(findSnippetToken('x #kusma y', 6)).toEqual({ start: 2, end: 8, query: 'kus' });
    });
});

describe('filterSnippets', () => {
    const items = [snippet('ishal', 'İshal anamnezi'), snippet('kusma', 'Kusma anamnezi'), snippet('kulak', 'Otitis muayenesi'), snippet('ates', 'Kusmalı ateş')];

    it('boş sorgu ilk `limit` parçayı verir', () => {
        expect(filterSnippets(items, '', 2).map((s) => s.shortcut)).toEqual(['ishal', 'kusma']);
    });

    it('Türkçe duyarsız; kısayolu sorguyla başlayanlar önce, sonra kısayol/başlıkta geçenler', () => {
        expect(filterSnippets(items, 'KUŞ', 10).map((s) => s.shortcut)).toEqual(['kusma', 'ates']);
        expect(filterSnippets(items, 'İSH', 10).map((s) => s.shortcut)).toEqual(['ishal']);
        expect(filterSnippets(items, 'anamnez', 10).map((s) => s.shortcut)).toEqual(['ishal', 'kusma']);
        expect(filterSnippets(items, 'ku', 10).map((s) => s.shortcut)).toEqual(['kusma', 'kulak', 'ates']);
    });

    it('eşleşme yoksa boş liste', () => {
        expect(filterSnippets(items, 'zzz', 10)).toEqual([]);
    });
});

describe('replaceSnippetToken', () => {
    it('#sorgu metni gövdeyle değişir, imleç eklenen metnin sonundadır', () => {
        const text = 'Öykü: #kus devam';
        const token = findSnippetToken(text, 10)!;

        expect(replaceSnippetToken(text, token, 'Kaç kez?\nİçerik?')).toEqual({ text: 'Öykü: Kaç kez?\nİçerik? devam', caret: 22 });
    });
});
