import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { configurePortalHttp, TEST_ME, TEST_PORTAL_BASE as BASE, testTokens as tokens, expectOneSoon, waitFor } from '@portal/app/testing/portal-testing';
import type { PortalMe } from './portal-auth.models';
import { PortalSessionService } from './portal-session.service';
import { PORTAL_STORAGE_KEYS, PortalTokenStore } from './portal-token.store';

const ME = TEST_ME;

describe('PortalSessionService', () => {
    let session: PortalSessionService;
    let store: PortalTokenStore;
    let http: HttpTestingController;

    beforeEach(() => {
        localStorage.clear();
        configurePortalHttp();
        session = TestBed.inject(PortalSessionService);
        store = TestBed.inject(PortalTokenStore);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        http.verify();
        localStorage.clear();
    });

    it('refresh token yoksa istek atmadan anonim döner', async () => {
        expect(await session.ensureSession()).toBe('anonymous');
        expect(session.isAuthenticated()).toBe(false);
    });

    it("açılışta refresh token'ı döndürür, /me yükler; access token yalnız bellekte kalır", async () => {
        localStorage.setItem(PORTAL_STORAGE_KEYS.refreshToken, 'refresh-0');
        const result = session.ensureSession();

        const refresh = await expectOneSoon(http, `${BASE}/auth/refresh`);

        expect(refresh.request.body).toEqual({ refreshToken: 'refresh-0' });
        expect(refresh.request.headers.has('Authorization')).toBe(false);
        refresh.flush(tokens(1));
        const me = await expectOneSoon(http, `${BASE}/me`);

        expect(me.request.headers.get('Authorization')).toBe('Bearer access-1');
        me.flush(ME);

        expect(await result).toBe('authenticated');
        expect(session.me()?.displayName).toBe('Ayşe');
        expect(store.accessToken()).toBe('access-1');
        expect(localStorage.getItem(PORTAL_STORAGE_KEYS.refreshToken)).toBe('refresh-1');

        const storedValues = Object.keys(localStorage).map((k) => localStorage.getItem(k));

        expect(storedValues).not.toContain('access-1');
        expect(Object.values(sessionStorage)).not.toContain('access-1');
    });

    it('sunucu yenilemeyi reddederse yerel oturumu siler', async () => {
        localStorage.setItem(PORTAL_STORAGE_KEYS.refreshToken, 'refresh-0');
        const result = session.ensureSession();

        (await expectOneSoon(http, `${BASE}/auth/refresh`)).flush({ extensions: { code: 'Portal.Auth.Unauthorized.InvalidRefreshToken' } }, { status: 401, statusText: 'Unauthorized' });

        expect(await result).toBe('anonymous');
        expect(localStorage.getItem(PORTAL_STORAGE_KEYS.refreshToken)).toBeNull();
    });

    it("ağ hatasında çevrimdışı döner ve refresh token'ı korur", async () => {
        localStorage.setItem(PORTAL_STORAGE_KEYS.refreshToken, 'refresh-0');
        const result = session.ensureSession();

        (await expectOneSoon(http, `${BASE}/auth/refresh`)).error(new ProgressEvent('error'), { status: 0 });

        expect(await result).toBe('offline');
        expect(localStorage.getItem(PORTAL_STORAGE_KEYS.refreshToken)).toBe('refresh-0');
    });

    it('eşzamanlı yenileme çağrıları tek istek paylaşır (döndürülen token iki kez kullanılmaz)', async () => {
        store.save(tokens(1));
        const received: string[] = [];

        session.refreshTokens().subscribe((t) => received.push(t.accessToken));
        session.refreshTokens().subscribe((t) => received.push(t.accessToken));
        (await expectOneSoon(http, `${BASE}/auth/refresh`)).flush(tokens(2));
        await waitFor(() => received.length === 2);

        expect(received).toEqual(['access-2', 'access-2']);
    });

    it("çıkışta refresh token'ı sunucuya bildirir ve yerel oturumu siler", async () => {
        store.save(tokens(1));
        store.setActiveLinkId('link-1');
        let done = false;

        session.logout().subscribe(() => (done = true));
        const req = http.expectOne(`${BASE}/auth/logout`);

        expect(req.request.body).toEqual({ refreshToken: 'refresh-1' });
        expect(req.request.headers.get('Authorization')).toBe('Bearer access-1');
        req.flush(null, { status: 204, statusText: 'No Content' });

        expect(done).toBe(true);
        expect(store.accessToken()).toBeNull();
        expect(localStorage.getItem(PORTAL_STORAGE_KEYS.refreshToken)).toBeNull();
        expect(localStorage.getItem(PORTAL_STORAGE_KEYS.activeLinkId)).toBeNull();
        expect(session.status()).toBe('anonymous');
    });

    it('çok klinikte seçim yoksa klinik seçimi ister; seçim cihazda hatırlanır', async () => {
        store.save(tokens(1));
        const twoLinks: PortalMe = { ...ME, links: [...ME.links, { linkId: 'link-2', clinicId: 'clinic-2', clinicName: 'Şube', clientFullName: 'Ayşe Yılmaz' }] };

        session.loadMe().subscribe();
        http.expectOne(`${BASE}/me`).flush(twoLinks);

        expect(session.needsClinicSelection()).toBe(true);

        session.selectLink('link-2');

        expect(session.activeLink()?.clinicName).toBe('Şube');
        expect(localStorage.getItem(PORTAL_STORAGE_KEYS.activeLinkId)).toBe('link-2');
    });

    it('portal depolama anahtarları klinik panelinin anahtarlarıyla çakışmaz', () => {
        const panelKeys = ['veteriner.access_token', 'veteriner.refresh_token', 'veteriner.active_clinic_id', 'veteriner.active_clinic_name'];

        Object.values(PORTAL_STORAGE_KEYS).forEach((key) => {
            expect(key.startsWith('vetinity.portal.')).toBe(true);
            expect(panelKeys).not.toContain(key);
        });
    });
});
