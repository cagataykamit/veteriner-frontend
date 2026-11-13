import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PortalTokenStore } from '@portal/app/core/auth/portal-token.store';
import { PORTAL_APP_LOCK_KEY, PORTAL_APP_LOCK_PLUGINS, PORTAL_APP_RELOCK_AFTER_MS, PortalAppLock } from './portal-app-lock';

describe('PortalAppLock', () => {
    let listeners: Map<string, () => void>;
    let verifyIdentity: Mock;
    let refreshToken: string | null;

    function setup(): PortalAppLock {
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: PORTAL_APP_LOCK_PLUGINS,
                    useValue: {
                        app: {
                            addListener: (name: string, fn: () => void) => {
                                listeners.set(name, fn);

                                return Promise.resolve({ remove: () => Promise.resolve() });
                            }
                        },
                        biometric: { isAvailable: vi.fn().mockResolvedValue({ isAvailable: true }), verifyIdentity }
                    }
                },
                { provide: PortalTokenStore, useValue: { refreshToken: () => refreshToken } }
            ]
        });

        return TestBed.inject(PortalAppLock);
    }

    beforeEach(() => {
        localStorage.clear();
        listeners = new Map();
        verifyIdentity = vi.fn().mockResolvedValue(undefined);
        refreshToken = 'refresh-1';
    });

    afterEach(() => {
        localStorage.clear();
        vi.useRealTimers();
    });

    it('varsayılan kapalı: oturum olsa da kilitli başlamaz', () => {
        const lock = setup();

        lock.start();

        expect(lock.enabled()).toBe(false);
        expect(lock.locked()).toBe(false);
    });

    it('açıksa ve oturum varsa kilitli başlar; doğrulanınca açılır', async () => {
        localStorage.setItem(PORTAL_APP_LOCK_KEY, '1');
        const lock = setup();

        lock.start();

        expect(lock.locked()).toBe(true);
        expect(await lock.unlock()).toBe(true);
        expect(lock.locked()).toBe(false);
    });

    it('oturum yoksa kilitlemez (giriş ekranı zaten kimlik ister)', () => {
        localStorage.setItem(PORTAL_APP_LOCK_KEY, '1');
        refreshToken = null;
        const lock = setup();

        lock.start();

        expect(lock.locked()).toBe(false);
    });

    it('doğrulanamazsa kilitli kalır', async () => {
        localStorage.setItem(PORTAL_APP_LOCK_KEY, '1');
        verifyIdentity.mockRejectedValue(new Error('vazgeçti'));
        const lock = setup();

        lock.start();

        expect(await lock.unlock()).toBe(false);
        expect(lock.locked()).toBe(true);
    });

    it('5 dakikadan uzun arka plandan dönünce yeniden kilitler, kısa sürede kilitlemez', async () => {
        vi.useFakeTimers();
        localStorage.setItem(PORTAL_APP_LOCK_KEY, '1');
        const lock = setup();

        lock.start();
        await lock.unlock();

        listeners.get('pause')!();
        vi.advanceTimersByTime(PORTAL_APP_RELOCK_AFTER_MS - 1000);
        listeners.get('resume')!();
        expect(lock.locked()).toBe(false);

        listeners.get('pause')!();
        vi.advanceTimersByTime(PORTAL_APP_RELOCK_AFTER_MS);
        listeners.get('resume')!();
        expect(lock.locked()).toBe(true);
    });

    it('açmak için kimlik doğrulanır ve tercih saklanır; doğrulanmazsa açılmaz; kapatma tercihi siler', async () => {
        const lock = setup();

        verifyIdentity.mockRejectedValueOnce(new Error('vazgeçti'));
        expect(await lock.enable()).toBe(false);
        expect(localStorage.getItem(PORTAL_APP_LOCK_KEY)).toBeNull();

        expect(await lock.enable()).toBe(true);
        expect(lock.enabled()).toBe(true);
        expect(localStorage.getItem(PORTAL_APP_LOCK_KEY)).toBe('1');

        lock.disable();
        expect(lock.enabled()).toBe(false);
        expect(localStorage.getItem(PORTAL_APP_LOCK_KEY)).toBeNull();
    });

    it('tarayıcıda biyometrik kullanılamaz', async () => {
        expect(await setup().available()).toBe(false);
    });
});
