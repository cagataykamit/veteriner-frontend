import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { ClinicPortalSettingsService, PortalInboxService } from '@/app/entities/owner-portal/services/owner-portal.service';
import { PortalInboxError } from '@/app/entities/owner-portal/utils/owner-portal-error.utils';

describe('hasta sahibi portalı klinik servisleri', () => {
    let http: HttpTestingController;
    const base = 'http://api.test';

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: base }]
        });
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('veri talepleri durum filtresini metin olarak gönderir ve sayfalı sonucu eşler', () => {
        let total = -1;

        TestBed.inject(PortalInboxService)
            .listDataRequests({ status: 'Open', page: 2, pageSize: 20 })
            .subscribe((r) => (total = r.totalItems));
        const req = http.expectOne((r) => r.url === `${base}/api/v1/portal-inbox/data-requests`);

        expect(req.request.params.get('status')).toBe('Open');
        expect(req.request.params.get('page')).toBe('2');
        req.flush({ items: [], page: 2, pageSize: 20, totalItems: 21, totalPages: 2 });
        expect(total).toBe(21);
    });

    it('ele almada not gönderilmez; kapanışta not kırpılır', () => {
        const service = TestBed.inject(PortalInboxService);

        service.updateDataRequestStatus('d1', 'InProgress', 'yok sayılır').subscribe();
        expect(http.expectOne(`${base}/api/v1/portal-inbox/data-requests/d1/status`).request.body).toEqual({ status: 'InProgress', responseNote: null });

        service.updateDataRequestStatus('d1', 'Rejected', '  Gerekçe  ').subscribe();
        expect(http.expectOne(`${base}/api/v1/portal-inbox/data-requests/d1/status`).request.body).toEqual({ status: 'Rejected', responseNote: 'Gerekçe' });
    });

    it('durum geçişi hatası bayat olarak işaretlenir', () => {
        let error: unknown;

        TestBed.inject(PortalInboxService)
            .updateDataRequestStatus('d1', 'Completed', 'Not')
            .subscribe({ error: (e) => (error = e) });
        http.expectOne(`${base}/api/v1/portal-inbox/data-requests/d1/status`).flush(
            { status: 409, extensions: { code: 'PortalInbox.InvalidStatusTransition' } },
            { status: 409, statusText: 'Conflict' }
        );

        expect(error).toBeInstanceOf(PortalInboxError);
        expect((error as PortalInboxError).isStale).toBe(true);
        expect((error as PortalInboxError).message).toContain('liste yenilendi');
    });

    it('klinik portal ayarı PUT { isEnabled } gönderir; kurallar boşsa boş liste döner', () => {
        const service = TestBed.inject(ClinicPortalSettingsService);
        let rules: unknown[] | null = null;

        service.save('c1', false).subscribe();
        const put = http.expectOne(`${base}/api/v1/clinics/c1/portal-settings`);

        expect(put.request.method).toBe('PUT');
        expect(put.request.body).toEqual({ isEnabled: false });
        put.flush({ clinicId: 'c1', isEnabled: false, updatedAtUtc: null, activeLinkCount: 0, pendingInviteCount: 0 });

        service.notificationRules().subscribe((r) => (rules = r));
        http.expectOne(`${base}/api/v1/portal-notification-rules`).flush(null);
        expect(rules).toEqual([]);
    });
});
