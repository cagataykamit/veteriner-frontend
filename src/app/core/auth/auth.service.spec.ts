import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, Subject, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from './auth.service';

const ACCESS = 'veteriner.access_token';
const REFRESH = 'veteriner.refresh_token';
const CLINIC_ID = 'veteriner.active_clinic_id';
const CLINIC_NAME = 'veteriner.active_clinic_name';

/** İmzasız test JWT'si; yük yalnız ASCII (btoa). */
const jwt = (payload: Record<string, unknown>): string => `eyJhbGciOiJub25lIn0.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.sig`;

const nowSec = () => Math.floor(Date.now() / 1000);

describe('AuthService', () => {
    let api: MockedObject<ApiClient>;

    const create = (): AuthService => {
        TestBed.configureTestingModule({ providers: [{ provide: ApiClient, useValue: api }] });

        return TestBed.inject(AuthService);
    };

    beforeEach(() => {
        localStorage.clear();
        api = {
            get: vi.fn().mockName('ApiClient.get'),
            post: vi.fn().mockName('ApiClient.post')
        } as unknown as MockedObject<ApiClient>;
    });

    afterEach(() => localStorage.clear());

    describe('token saklama ve okuma', () => {
        it('oturum yokken anahtar yok, oturum kapalı', () => {
            const auth = create();

            expect(auth.getAccessToken()).toBeNull();
            expect(auth.getRefreshToken()).toBeNull();
            expect(auth.isAuthenticated()).toBe(false);
            expect(auth.getUserId()).toBeNull();
        });

        it('açılışta localStorage’daki erişim anahtarını okur', () => {
            const token = jwt({ sub: 'u1' });

            localStorage.setItem(ACCESS, token);
            const auth = create();

            expect(auth.getAccessToken()).toBe(token);
            expect(auth.isAuthenticated()).toBe(true);
            expect(auth.isLoggedIn()).toBe(true);
            expect(auth.getUserId()).toBe('u1');
        });

        it('login: farklı ad biçimli yanıtı normalize eder, anahtarları yazar, eski klinik bağlamını siler', async () => {
            localStorage.setItem(CLINIC_ID, 'eski-klinik');
            localStorage.setItem(CLINIC_NAME, 'Eski');
            const token = jwt({ sub: 'u1' });

            api.post.mockReturnValue(of({ AccessToken: ` ${token} `, refresh_token: 'rt-1', ExpiresAt: '2026-10-26T12:00:00Z', tenantMembershipCount: '2', ResolvedTenantId: ' t1 ' }));
            const auth = create();

            const tokens = await firstValueFrom(auth.login({ email: 'a@b.c', password: 'x' }));

            expect(api.post).toHaveBeenCalledWith(ApiEndpoints.auth.login(), { email: 'a@b.c', password: 'x' });
            expect(tokens).toEqual({ accessToken: token, refreshToken: 'rt-1', expiresAt: '2026-10-26T12:00:00Z', resolvedTenantId: 't1', tenantMembershipCount: 2 });
            expect(localStorage.getItem(ACCESS)).toBe(token);
            expect(localStorage.getItem(REFRESH)).toBe('rt-1');
            expect(localStorage.getItem(CLINIC_ID)).toBeNull();
            expect(localStorage.getItem(CLINIC_NAME)).toBeNull();
            expect(auth.getClinicId()).toBeNull();
        });

        it('token klinik claim’i varsa klinik bağlamı token’dan gelir ve saklanır', () => {
            const auth = create();

            auth.setSession({ accessToken: jwt({ sub: 'u1', clinic_id: ' c1 ', clinic_name: 'Merkez' }), refreshToken: 'rt', expiresAt: null });

            expect(auth.getClinicId()).toBe('c1');
            expect(auth.getJwtClinicId()).toBe('c1');
            expect(auth.getClinicName()).toBe('Merkez');
            expect(auth.activeClinicLabel()).toBe('Merkez');
            expect(auth.hasSelectedClinic()).toBe(true);
            expect(localStorage.getItem(CLINIC_ID)).toBe('c1');
            expect(localStorage.getItem(CLINIC_NAME)).toBe('Merkez');
        });

        it('token’da klinik yoksa saklanan klinik kullanılır; JWT klinik kimliği yine null', () => {
            localStorage.setItem(ACCESS, jwt({ sub: 'u1' }));
            localStorage.setItem(CLINIC_ID, ' c9 ');
            const auth = create();

            expect(auth.getClinicId()).toBe('c9');
            expect(auth.getJwtClinicId()).toBeNull();
            expect(auth.getClinicName()).toBeNull();
            expect(auth.activeClinicLabel()).toBe('c9');
        });

        it('çözülemeyen token: claim yok sayılır, süresi dolmuş sayılmaz', () => {
            localStorage.setItem(ACCESS, 'bozuk');
            const auth = create();

            expect(auth.isAuthenticated()).toBe(true);
            expect(auth.getUserId()).toBeNull();
            expect(auth.hasOperationClaim('Visits.Read')).toBe(false);
            expect(auth.isAccessTokenExpired()).toBe(false);
        });
    });

    describe('operation claim kontrolü', () => {
        it('izinler farklı claim anahtarlarından toplanır; büyük/küçük harf ve boşluk duyarsız tam eşleşme', () => {
            const auth = create();

            auth.setSession({
                accessToken: jwt({ permissions: ['Visits.Read'], Roles: 'Clients.Create', scope: 'Charges.Read Payments.Create', 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': ['Admin'] }),
                refreshToken: null,
                expiresAt: null
            });

            expect(auth.hasOperationClaim('visits.read')).toBe(true);
            expect(auth.hasOperationClaim('  CLIENTS.CREATE ')).toBe(true);
            expect(auth.hasOperationClaim('Charges.Read')).toBe(true);
            expect(auth.hasOperationClaim('Payments.Create')).toBe(true);
            expect(auth.hasOperationClaim('Admin')).toBe(true);
            expect(auth.hasOperationClaim('Visits')).toBe(false);
            expect(auth.hasOperationClaim('Visits.Create')).toBe(false);
            expect(auth.hasOperationClaim('   ')).toBe(false);
        });

        it('büyük/küçük harf duyarsızlığı dilden bağımsızdır: "I" içeren kodlar Türkçe ı/İ dönüşümüne takılmaz', () => {
            const auth = create();

            auth.setSession({ accessToken: jwt({ permissions: ['Clients.Create', 'Imports.Read', 'CLINICS.UPDATE'] }), refreshToken: null, expiresAt: null });

            expect(auth.hasOperationClaim('CLIENTS.CREATE')).toBe(true);
            expect(auth.hasOperationClaim('Imports.Read')).toBe(true);
            expect(auth.hasOperationClaim('imports.read')).toBe(true);
            expect(auth.hasOperationClaim('IMPORTS.READ')).toBe(true);
            expect(auth.hasOperationClaim('Clinics.Update')).toBe(true);
        });

        it('token yoksa hiçbir claim yok', () => {
            expect(create().hasOperationClaim('Visits.Read')).toBe(false);
        });

        it('platform_admin izin listesinden değil platform_admin claim’inden çözülür', () => {
            const auth = create();

            auth.setSession({ accessToken: jwt({ permissions: ['platform_admin'] }), refreshToken: null, expiresAt: null });
            expect(auth.isPlatformAdmin()).toBe(false);
            expect(auth.hasOperationClaim('platform_admin')).toBe(false);

            auth.setSession({ accessToken: jwt({ platform_admin: true }), refreshToken: null, expiresAt: null });
            expect(auth.isPlatformAdmin()).toBe(true);
            expect(auth.hasOperationClaim('Platform_Admin')).toBe(true);

            auth.setSession({ accessToken: jwt({ platform_admin: ' TRUE ' }), refreshToken: null, expiresAt: null });
            expect(auth.isPlatformAdmin()).toBe(true);
        });
    });

    describe('süre ve yenileme', () => {
        it('exp saniye veya milisaniye olabilir; leeway süresi dolmuş sayılır', () => {
            const auth = create();

            auth.setSession({ accessToken: jwt({ exp: nowSec() + 20 }), refreshToken: null, expiresAt: null });
            expect(auth.isAccessTokenExpired()).toBe(true);
            expect(auth.isAccessTokenExpired(0)).toBe(false);

            auth.setSession({ accessToken: jwt({ exp: String((nowSec() + 3600) * 1000) }), refreshToken: null, expiresAt: null });
            expect(auth.isAccessTokenExpired()).toBe(false);
        });

        it('refreshSession: yenileme anahtarı yoksa hata, istek atılmaz', async () => {
            const auth = create();

            await expect(firstValueFrom(auth.refreshSession())).rejects.toThrow('Yenileme anahtarı yok.');
            expect(api.post).not.toHaveBeenCalled();
        });

        it('refreshSession: paralel çağrılar tek istekte birleşir; yeni anahtarlar yazılır', async () => {
            const response = new Subject<unknown>();
            const fresh = jwt({ sub: 'u1', exp: nowSec() + 3600 });

            localStorage.setItem(REFRESH, 'rt-eski');
            api.post.mockReturnValue(response);
            const auth = create();
            const first = firstValueFrom(auth.refreshSession());
            const second = firstValueFrom(auth.refreshSession());

            response.next({ accessToken: fresh, refreshToken: 'rt-yeni' });
            response.complete();

            await expect(first).resolves.toEqual(expect.objectContaining({ accessToken: fresh, refreshToken: 'rt-yeni' }));
            await expect(second).resolves.toEqual(expect.objectContaining({ accessToken: fresh }));
            expect(api.post).toHaveBeenCalledTimes(1);
            expect(api.post).toHaveBeenCalledWith(ApiEndpoints.auth.refresh(), { refreshToken: 'rt-eski' });
            expect(auth.getAccessToken()).toBe(fresh);
            expect(localStorage.getItem(REFRESH)).toBe('rt-yeni');
        });

        it('refreshSession: hata sonrası sonraki çağrı yeni istek atar', async () => {
            localStorage.setItem(REFRESH, 'rt');
            api.post.mockReturnValueOnce(throwError(() => new Error('ağ'))).mockReturnValueOnce(of({ accessToken: jwt({ sub: 'u1' }) }));
            const auth = create();

            await expect(firstValueFrom(auth.refreshSession())).rejects.toThrow('ağ');
            await firstValueFrom(auth.refreshSession());
            expect(api.post).toHaveBeenCalledTimes(2);
        });

        it('ensureValidAccessToken: token yoksa null; geçerliyse aynı token; ikisinde de authReady olur', async () => {
            const empty = create();

            expect(empty.authReady()).toBe(false);
            await expect(firstValueFrom(empty.ensureValidAccessToken())).resolves.toBeNull();
            expect(empty.authReady()).toBe(true);

            TestBed.resetTestingModule();
            const token = jwt({ exp: nowSec() + 3600 });

            localStorage.setItem(ACCESS, token);
            const valid = create();

            await expect(firstValueFrom(valid.ensureValidAccessToken())).resolves.toBe(token);
            expect(valid.authReady()).toBe(true);
            expect(api.post).not.toHaveBeenCalled();
        });

        it('ensureValidAccessToken: süresi dolmuş ve yenileme anahtarı yoksa oturum temizlenir', async () => {
            localStorage.setItem(ACCESS, jwt({ exp: nowSec() - 60 }));
            const auth = create();

            await expect(firstValueFrom(auth.ensureValidAccessToken())).resolves.toBeNull();
            expect(auth.isAuthenticated()).toBe(false);
            expect(localStorage.getItem(ACCESS)).toBeNull();
            expect(api.post).not.toHaveBeenCalled();
        });

        it('ensureValidAccessToken: süresi dolmuşsa yeniler ve yeni token’ı döner', async () => {
            const fresh = jwt({ exp: nowSec() + 3600 });

            localStorage.setItem(ACCESS, jwt({ exp: nowSec() - 60 }));
            localStorage.setItem(REFRESH, 'rt');
            api.post.mockReturnValue(of({ accessToken: fresh }));
            const auth = create();

            await expect(firstValueFrom(auth.ensureValidAccessToken())).resolves.toBe(fresh);
            expect(auth.authReady()).toBe(true);
            expect(localStorage.getItem(REFRESH)).toBe('rt');
        });

        it('ensureValidAccessToken: yenileme hatasında oturum temizlenir ve hata iletilir', async () => {
            localStorage.setItem(ACCESS, jwt({ exp: nowSec() - 60 }));
            localStorage.setItem(REFRESH, 'rt');
            api.post.mockReturnValue(throwError(() => new Error('401')));
            const auth = create();

            await expect(firstValueFrom(auth.ensureValidAccessToken())).rejects.toThrow('401');
            expect(auth.isAuthenticated()).toBe(false);
            expect(localStorage.getItem(REFRESH)).toBeNull();
            expect(auth.authReady()).toBe(true);
        });
    });

    describe('klinik seçimi', () => {
        it('yenileme anahtarı yoksa hata, istek atılmaz', async () => {
            await expect(firstValueFrom(create().selectClinic('c1'))).rejects.toThrow('Klinik seçimi için yenileme anahtarı bulunamadı. Lütfen tekrar giriş yapın.');
            expect(api.post).not.toHaveBeenCalled();
        });

        it('seçilen klinik kırpılarak gider; yeni token ve klinik bağlamı yazılır', async () => {
            const token = jwt({ sub: 'u1' });

            localStorage.setItem(REFRESH, 'rt');
            api.post.mockReturnValue(of({ accessToken: token }));
            const auth = create();

            await firstValueFrom(auth.selectClinic(' c2 ', ' Şube '));

            expect(api.post).toHaveBeenCalledWith(ApiEndpoints.auth.selectClinic(), { refreshToken: 'rt', clinicId: 'c2' });
            expect(auth.getAccessToken()).toBe(token);
            expect(auth.getClinicId()).toBe('c2');
            expect(auth.getClinicName()).toBe('Şube');
            expect(localStorage.getItem(CLINIC_ID)).toBe('c2');
        });

        it('klinik kararı: 0 yok, 1 tek, fazlası seçim', () => {
            const auth = create();
            const c1 = { id: 'c1', name: 'A' };

            expect(auth.resolveClinicDecision([])).toEqual({ kind: 'none' });
            expect(auth.resolveClinicDecision([c1])).toEqual({ kind: 'single', clinic: c1 });
            expect(auth.resolveClinicDecision([c1, { id: 'c2', name: 'B' }])).toEqual({ kind: 'multiple' });
        });
    });

    describe('klinik listesi önbelleği', () => {
        it('yanıt normalize edilir: kimliksiz/adsız ve pasif klinik düşer', async () => {
            api.get.mockReturnValue(of({ items: [{ Id: ' c1 ', Name: ' A ' }, { id: 'c2', name: 'B', isActive: 'false' }, { id: 'c3' }, { clinicId: 'c4', clinicName: 'D', IsActive: true }] }));

            await expect(firstValueFrom(create().getMyClinics())).resolves.toEqual([
                { id: 'c1', name: 'A' },
                { id: 'c4', name: 'D', isActive: true }
            ]);
            expect(api.get).toHaveBeenCalledWith(ApiEndpoints.me.clinics());
        });

        it('aynı kimlikte TTL içinde istek paylaşılır; forceRefresh ve clearMyClinicsCache yeniden çeker', async () => {
            api.get.mockReturnValue(of([]));
            const auth = create();

            await firstValueFrom(auth.getMyClinics());
            await firstValueFrom(auth.getMyClinics());
            expect(api.get).toHaveBeenCalledTimes(1);

            await firstValueFrom(auth.getMyClinics(true));
            expect(api.get).toHaveBeenCalledTimes(2);

            auth.clearMyClinicsCache();
            await firstValueFrom(auth.getMyClinics());
            expect(api.get).toHaveBeenCalledTimes(3);
        });
    });

    describe('çıkış', () => {
        const signedIn = (): AuthService => {
            localStorage.setItem(ACCESS, jwt({ sub: 'u1', clinic_id: 'c1' }));
            localStorage.setItem(REFRESH, 'rt');
            localStorage.setItem(CLINIC_ID, 'c1');
            localStorage.setItem(CLINIC_NAME, 'Merkez');

            return create();
        };

        const expectCleared = (auth: AuthService) => {
            expect(auth.isAuthenticated()).toBe(false);
            expect(auth.getClinicId()).toBeNull();

            for (const key of [ACCESS, REFRESH, CLINIC_ID, CLINIC_NAME]) {
                expect(localStorage.getItem(key), key).toBeNull();
            }
        };

        it('logout yerel oturumu ve klinik bağlamını temizler, istek atmaz', () => {
            const auth = signedIn();

            auth.logout();
            expectCleared(auth);
            expect(api.post).not.toHaveBeenCalled();
        });

        it('logoutCurrentSession: sunucuya yenileme anahtarıyla gider, yanıtı normalize eder, sonra temizler', async () => {
            api.post.mockReturnValue(of({ Success: true, Message: 'Çıkış yapıldı' }));
            const auth = signedIn();

            await expect(firstValueFrom(auth.logoutCurrentSession())).resolves.toEqual({ success: true, message: 'Çıkış yapıldı' });
            expect(api.post).toHaveBeenCalledWith(ApiEndpoints.auth.logout(), { refreshToken: 'rt' });
            expectCleared(auth);
        });

        it('logoutAllSessions: eski `ok` alanı da başarı sayılır', async () => {
            api.post.mockReturnValue(of({ ok: true }));
            const auth = signedIn();

            await expect(firstValueFrom(auth.logoutAllSessions())).resolves.toEqual({ success: true, message: null });
            expect(api.post).toHaveBeenCalledWith(ApiEndpoints.auth.logoutAll(), { refreshToken: 'rt' });
            expectCleared(auth);
        });

        it('yenileme anahtarı yoksa sunucuya gitmeden başarı döner ve temizler', async () => {
            localStorage.setItem(ACCESS, jwt({ sub: 'u1' }));
            const auth = create();

            await expect(firstValueFrom(auth.logoutCurrentSession())).resolves.toEqual({ success: true });
            await expect(firstValueFrom(auth.logoutAllSessions())).resolves.toEqual({ success: true });
            expect(api.post).not.toHaveBeenCalled();
            expect(auth.isAuthenticated()).toBe(false);
        });

        it('sunucu çıkışı hata verirse yerel oturum korunur ve hata iletilir', async () => {
            api.post.mockReturnValue(throwError(() => new Error('500')));
            const auth = signedIn();

            await expect(firstValueFrom(auth.logoutCurrentSession())).rejects.toThrow('500');
            expect(auth.isAuthenticated()).toBe(true);
            expect(localStorage.getItem(REFRESH)).toBe('rt');
        });
    });
});
