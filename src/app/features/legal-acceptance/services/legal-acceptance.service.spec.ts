import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { LegalAcceptanceService } from './legal-acceptance.service';

describe('LegalAcceptanceService', () => {
    let http: HttpTestingController;
    let service: LegalAcceptanceService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
        });
        http = TestBed.inject(HttpTestingController);
        service = TestBed.inject(LegalAcceptanceService);
    });

    afterEach(() => http.verify());

    it('güncel sürümler herkese açık uçtan bir kez okunur; yenileme yeniden ister', () => {
        const seen: string[] = [];

        service.getCurrentVersions().subscribe((v) => seen.push(v.map((d) => d.version).join(',')));
        http.expectOne('http://api.test/api/v1/public/legal-documents').flush([{ documentType: 'Terms', version: '0.1' }]);
        service.getCurrentVersions().subscribe((v) => seen.push(v.map((d) => d.version).join(',')));
        http.expectNone('http://api.test/api/v1/public/legal-documents');

        service.refreshCurrentVersions().subscribe((v) => seen.push(v.map((d) => d.version).join(',')));
        http.expectOne('http://api.test/api/v1/public/legal-documents').flush([{ documentType: 'Terms', version: '1.0' }]);

        expect(seen).toEqual(['0.1', '0.1', '1.0']);
    });

    it('okuma hatasında önbellek tutulmaz', () => {
        service.getCurrentVersions().subscribe({ error: () => undefined });
        http.expectOne('http://api.test/api/v1/public/legal-documents').flush(null, { status: 500, statusText: 'err' });

        service.getCurrentVersions().subscribe();
        http.expectOne('http://api.test/api/v1/public/legal-documents').flush([]);
    });

    it('bekleyen durum GET, kabul POST ile gönderilir', () => {
        service.getMyStatus().subscribe();
        http.expectOne('http://api.test/api/v1/me/legal-acceptances').flush({ requiresAcceptance: false, pendingDocuments: [] });

        service.accept([{ documentType: 'Privacy', version: '0.1' }]).subscribe();
        const post = http.expectOne('http://api.test/api/v1/me/legal-acceptances');

        expect(post.request.method).toBe('POST');
        expect(post.request.body).toEqual({ documents: [{ documentType: 'Privacy', version: '0.1' }] });
        post.flush({ requiresAcceptance: false, pendingDocuments: [] });
    });
});
