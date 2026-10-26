import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { PORTAL_STORAGE_KEYS, PortalTokenStore } from '@portal/app/core/auth/portal-token.store';
import { configurePortalHttp, TEST_PORTAL_BASE as BASE, expectOneSoon, testTokens, waitFor } from '@portal/app/testing/portal-testing';

describe('portalAuthInterceptor', () => {
    let http: HttpClient;
    let backend: HttpTestingController;
    let store: PortalTokenStore;
    let router: Router;

    beforeEach(() => {
        localStorage.clear();
        configurePortalHttp();
        http = TestBed.inject(HttpClient);
        backend = TestBed.inject(HttpTestingController);
        store = TestBed.inject(PortalTokenStore);
        router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate').mockResolvedValue(true);
        store.save(testTokens(1));
    });

    afterEach(() => {
        backend.verify();
        localStorage.clear();
    });

    it('oturumlu portal isteğine Bearer ekler', () => {
        http.get(`${BASE}/me`).subscribe();

        expect(backend.expectOne(`${BASE}/me`).request.headers.get('Authorization')).toBe('Bearer access-1');
    });

    it('anonim portal uçlarına ve portal dışı adreslere Bearer eklemez', () => {
        http.post(`${BASE}/auth/login`, {}).subscribe();
        http.get(`${BASE}/invites/abc`).subscribe();
        http.get('/api/v1/clients').subscribe();

        expect(backend.expectOne(`${BASE}/auth/login`).request.headers.has('Authorization')).toBe(false);
        expect(backend.expectOne(`${BASE}/invites/abc`).request.headers.has('Authorization')).toBe(false);
        expect(backend.expectOne('/api/v1/clients').request.headers.has('Authorization')).toBe(false);
    });

    it("401 sonrası bir kez yeniler ve isteği yeni token'la tekrarlar", async () => {
        let body: unknown;

        http.get(`${BASE}/me`).subscribe((b) => (body = b));
        backend.expectOne(`${BASE}/me`).flush(null, { status: 401, statusText: 'Unauthorized' });
        const refresh = await expectOneSoon(backend, `${BASE}/auth/refresh`);

        expect(refresh.request.body).toEqual({ refreshToken: 'refresh-1' });
        refresh.flush(testTokens(2));
        const retry = await expectOneSoon(backend, `${BASE}/me`);

        expect(retry.request.headers.get('Authorization')).toBe('Bearer access-2');
        retry.flush({ ok: true });

        expect(body).toEqual({ ok: true });
        expect(localStorage.getItem(PORTAL_STORAGE_KEYS.refreshToken)).toBe('refresh-2');
    });

    it('yenileme reddedilirse oturumu siler ve girişe yönlendirir', async () => {
        let error: unknown;

        http.get(`${BASE}/me`).subscribe({ error: (e) => (error = e) });
        backend.expectOne(`${BASE}/me`).flush(null, { status: 401, statusText: 'Unauthorized' });
        (await expectOneSoon(backend, `${BASE}/auth/refresh`)).flush(null, { status: 401, statusText: 'Unauthorized' });
        await waitFor(() => error !== undefined);

        expect((error as HttpErrorResponse).status).toBe(401);
        expect(store.accessToken()).toBeNull();
        expect(localStorage.getItem(PORTAL_STORAGE_KEYS.refreshToken)).toBeNull();
        expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { reason: 'expired' } });
    });

    it('tekrar denemede yine 401 gelirse ikinci kez yenilemez, girişe yönlendirir', async () => {
        let failed = false;

        http.get(`${BASE}/me`).subscribe({ error: () => (failed = true) });
        backend.expectOne(`${BASE}/me`).flush(null, { status: 401, statusText: 'Unauthorized' });
        (await expectOneSoon(backend, `${BASE}/auth/refresh`)).flush(testTokens(2));
        (await expectOneSoon(backend, `${BASE}/me`)).flush(null, { status: 401, statusText: 'Unauthorized' });
        await waitFor(() => failed);

        backend.expectNone(`${BASE}/auth/refresh`);
        expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { reason: 'expired' } });
    });

    it('401 dışındaki hatalarda yenileme denemez', () => {
        http.get(`${BASE}/me`).subscribe({ error: () => undefined });
        backend.expectOne(`${BASE}/me`).flush(null, { status: 500, statusText: 'Server Error' });

        backend.expectNone(`${BASE}/auth/refresh`);
        expect(router.navigate).not.toHaveBeenCalled();
    });
});
