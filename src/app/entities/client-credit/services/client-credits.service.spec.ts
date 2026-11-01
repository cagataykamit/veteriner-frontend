import { HttpErrorResponse, provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClientCreditsService } from './client-credits.service';

describe('ClientCreditsService', () => {
    let http: HttpTestingController;
    let service: ClientCreditsService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }, { provide: AuthService, useValue: { getClinicId: () => 'k1' } }]
        });
        http = TestBed.inject(HttpTestingController);
        service = TestBed.inject(ClientCreditsService);
    });

    afterEach(() => http.verify());

    it('liste: varsayılan yalnız açık, includeClosed istenince sorguya eklenir', () => {
        service.getCredits('c1').subscribe();
        http.expectOne((r) => r.url === 'http://api.test/api/v1/clients/c1/credits' && !r.params.has('includeClosed')).flush([]);

        service.getCredits('c1', true).subscribe();
        http.expectOne((r) => r.url === 'http://api.test/api/v1/clients/c1/credits' && r.params.get('includeClosed') === 'true').flush([]);
    });

    it('mahsup: aktif klinik, requestId ve satırlarla POST; hata ham iletilir (kod çağıranda okunur)', () => {
        let error: unknown;

        service.applyCredit('c1', 'r1', [{ chargeId: 'ch1', amount: 250 }]).subscribe({ error: (e: unknown) => (error = e) });
        const req = http.expectOne('http://api.test/api/v1/clients/c1/credits/apply');

        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ clinicId: 'k1', requestId: 'r1', allocations: [{ chargeId: 'ch1', amount: 250 }] });
        req.flush({ extensions: { code: 'ClientCredits.InsufficientBalance' } }, { status: 409, statusText: 'Conflict' });
        expect(error).toBeInstanceOf(HttpErrorResponse);
    });

    it('geri alma: gerekçeyle POST; 409 kapalı kredi Türkçe mesaj olur', () => {
        let message = '';

        service.reverseApplication('c1', 'a1', ' Yanlış ücret ').subscribe({ error: (e: Error) => (message = e.message) });
        const req = http.expectOne('http://api.test/api/v1/clients/c1/credits/applications/a1/reverse');

        expect(req.request.body).toEqual({ reason: 'Yanlış ücret' });
        req.flush({ extensions: { code: 'ClientCredits.CreditClosed' } }, { status: 409, statusText: 'Conflict' });
        expect(message).toContain('mahsup geri alınamaz');
    });

    it('iade: gerekçe ve yöntemle POST; kalan yoksa Türkçe mesaj', () => {
        let message = '';

        service.refundCredit('c1', 'cr1', 'Müşteri istedi', 'cash').subscribe({ error: (e: Error) => (message = e.message) });
        const req = http.expectOne('http://api.test/api/v1/clients/c1/credits/cr1/refund');

        expect(req.request.body).toEqual({ reason: 'Müşteri istedi', method: 'Cash' });
        req.flush({ extensions: { code: 'ClientCredits.NothingToRefund' } }, { status: 409, statusText: 'Conflict' });
        expect(message).toContain('iade edilecek kalanı yok');
    });
});
