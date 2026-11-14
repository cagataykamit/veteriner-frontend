import { TestBed } from '@angular/core/testing';
import { PORTAL_STORAGE_KEYS, PortalTokenStore } from '@portal/app/core/auth/portal-token.store';
import { testTokens } from '@portal/app/testing/portal-testing';
import { nativeSecureStorage, PORTAL_SECURE_STORAGE, type PortalSecureStorage } from './portal-secure-storage';

/** Eklentinin bellek içi taklidi. */
function fakePlugin(failSet = false) {
    const data = new Map<string, string>();

    return {
        data,
        isDataSaved: ({ key }: { key: string }) => Promise.resolve({ isSaved: data.has(key) }),
        getData: ({ key }: { key: string }) => Promise.resolve({ value: data.get(key)! }),
        setData: ({ key, value }: { key: string; value: string }) => (failSet ? Promise.reject(new Error('keystore')) : Promise.resolve(void data.set(key, value))),
        deleteData: ({ key }: { key: string }) => (data.delete(key) ? Promise.resolve() : Promise.reject(new Error('yok')))
    };
}

describe('nativeSecureStorage', () => {
    it('yazar, okur, siler; kayıt yoksa null ve silme hatasız', async () => {
        const storage = nativeSecureStorage(fakePlugin());

        expect(await storage.get('k')).toBeNull();
        await storage.set('k', 'v');
        expect(await storage.get('k')).toBe('v');
        await storage.remove('k');
        await expect(storage.remove('k')).resolves.toBeUndefined();
        expect(await storage.get('k')).toBeNull();
    });
});

describe('PortalTokenStore (mağaza paketi)', () => {
    let plugin: ReturnType<typeof fakePlugin>;

    function setup(storage: PortalSecureStorage): PortalTokenStore {
        TestBed.configureTestingModule({ providers: [{ provide: PORTAL_SECURE_STORAGE, useValue: storage }] });

        return TestBed.inject(PortalTokenStore);
    }

    beforeEach(() => {
        localStorage.clear();
        plugin = fakePlugin();
    });

    it("refresh token'ı anahtar deposuna yazar, localStorage'a yazmaz; açılışta depodan okur", async () => {
        const store = setup(nativeSecureStorage(plugin));

        await store.save(testTokens(1));

        expect(store.refreshToken()).toBe(testTokens(1).refreshToken);
        expect(plugin.data.get(PORTAL_STORAGE_KEYS.refreshToken)).toBe(testTokens(1).refreshToken);
        expect(localStorage.getItem(PORTAL_STORAGE_KEYS.refreshToken)).toBeNull();

        TestBed.resetTestingModule();
        const reopened = setup(nativeSecureStorage(plugin));

        expect(reopened.refreshToken()).toBeNull();
        await reopened.hydrate();
        expect(reopened.refreshToken()).toBe(testTokens(1).refreshToken);
    });

    it('çıkışta depodan siler', async () => {
        const store = setup(nativeSecureStorage(plugin));

        await store.save(testTokens(1));

        store.clear();

        await vi.waitFor(() => expect(plugin.data.has(PORTAL_STORAGE_KEYS.refreshToken)).toBe(false));
        expect(store.refreshToken()).toBeNull();
    });

    it('depoya yazılamazsa oturum bu açılışta bellekte sürer', async () => {
        const store = setup(nativeSecureStorage(fakePlugin(true)));

        await expect(store.save(testTokens(2))).resolves.toBeUndefined();
        expect(store.refreshToken()).toBe(testTokens(2).refreshToken);
    });
});
