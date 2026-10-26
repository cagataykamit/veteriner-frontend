import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';

describe('ClientsService — portal erişimi (PORTAL_API_CONTRACT §4)', () => {
    let service: ClientsService;
    let http: HttpTestingController;
    let clinicId: string | null;

    beforeEach(() => {
        clinicId = 'k1';
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }, { provide: AuthService, useValue: { getClinicId: () => clinicId } }]
        });
        service = TestBed.inject(ClientsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('durum GET /clients/{id}/portal-access', () => {
        let canInvite: boolean | undefined;

        service.getPortalAccess('c 1').subscribe((r) => (canInvite = r.canInvite));
        const req = http.expectOne('http://api.test/api/v1/clients/c%201/portal-access');

        expect(req.request.method).toBe('GET');
        req.flush({ clientId: 'c 1', canInvite: true, inviteBlockedCode: null, links: [], invites: [] });
        expect(canInvite).toBeTrue();
    });

    it('davet gövdesine aktif klinik yazılır; klinik yoksa gövde boş', () => {
        service.sendPortalInvite('c1').subscribe();
        const withClinic = http.expectOne('http://api.test/api/v1/clients/c1/portal-invites');

        expect(withClinic.request.method).toBe('POST');
        expect(withClinic.request.body).toEqual({ clinicId: 'k1' });
        withClinic.flush({});

        clinicId = null;
        service.sendPortalInvite('c1').subscribe();
        const withoutClinic = http.expectOne('http://api.test/api/v1/clients/c1/portal-invites');

        expect(withoutClinic.request.body).toEqual({});
        withoutClinic.flush({});
    });

    it('409 OwnerPortal.ClientOptedOut anlaşılır Türkçe mesaja çevrilir', () => {
        let message = '';

        service.sendPortalInvite('c1').subscribe({ error: (e: Error) => (message = e.message) });
        http.expectOne('http://api.test/api/v1/clients/c1/portal-invites').flush({ title: 'Conflict', status: 409, extensions: { code: 'OwnerPortal.ClientOptedOut' } }, { status: 409, statusText: 'Conflict' });

        expect(message).toContain('Portal daveti bu müşteriye gönderilemez');
        expect(message).toContain('KVKK açık rızayı reddetmiş ya da hatırlatma istemiyor');
    });

    it('iptal ve erişimi kapat POST uçları (204)', () => {
        let revoked = false;
        let closed = false;

        service.revokePortalInvite('c1', 'i1').subscribe(() => (revoked = true));
        const revoke = http.expectOne('http://api.test/api/v1/clients/c1/portal-invites/i1/revoke');

        expect(revoke.request.method).toBe('POST');
        revoke.flush(null, { status: 204, statusText: 'No Content' });

        service.closePortalLink('c1', 'l1').subscribe(() => (closed = true));
        const close = http.expectOne('http://api.test/api/v1/clients/c1/portal-links/l1/close');

        expect(close.request.method).toBe('POST');
        close.flush(null, { status: 204, statusText: 'No Content' });

        expect(revoked).toBeTrue();
        expect(closed).toBeTrue();
    });

    it('409 OwnerPortal.LinkAlreadyClosed mesajı', () => {
        let message = '';

        service.closePortalLink('c1', 'l1').subscribe({ error: (e: Error) => (message = e.message) });
        http.expectOne('http://api.test/api/v1/clients/c1/portal-links/l1/close').flush({ status: 409, extensions: { code: 'OwnerPortal.LinkAlreadyClosed' } }, { status: 409, statusText: 'Conflict' });

        expect(message).toBe('Bu portal erişimi zaten kapatılmış. Sayfayı yenileyin.');
    });
});
