import { clearAllSessionDrafts, readSessionDraft, removeSessionDraft, sessionDraftKey, writeSessionDraft } from './session-draft.storage';

describe('session-draft.storage', () => {
    afterEach(() => sessionStorage.clear());

    it('yazar, okur, siler; anahtar önekli', () => {
        const key = sessionDraftKey('muayene', 'u1', null, 'e1');

        expect(key).toBe('vetinity:taslak:muayene:u1:-:e1');
        writeSessionDraft(key, { a: 1 }, new Date('2026-11-16T10:00:00Z'));
        expect(readSessionDraft<{ a: number }>(key)).toEqual({ savedAtUtc: '2026-11-16T10:00:00.000Z', data: { a: 1 } });
        removeSessionDraft(key);
        expect(readSessionDraft(key)).toBeNull();
    });

    it('bozuk içerik yok sayılır', () => {
        sessionStorage.setItem('vetinity:taslak:x', '{bozuk');

        expect(readSessionDraft('vetinity:taslak:x')).toBeNull();
    });

    it('tümünü silme yalnız taslakları siler', () => {
        writeSessionDraft(sessionDraftKey('a'), 1);
        writeSessionDraft(sessionDraftKey('b'), 2);
        sessionStorage.setItem('baska', 'kalsin');

        clearAllSessionDrafts();

        expect(sessionStorage.length).toBe(1);
        expect(sessionStorage.getItem('baska')).toBe('kalsin');
    });
});
