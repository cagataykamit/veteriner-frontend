import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import { PaymentsService } from '@/app/features/payments/services/payments.service';

describe('PaymentsService.voidPayment', () => {
    let service: PaymentsService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
                { provide: AuthService, useValue: { getClinicId: () => 'c1' } }
            ]
        });
        service = TestBed.inject(PaymentsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('POST void ucuna kırpılmış gerekçe gider; 204 boş döner', (done) => {
        service.voidPayment('p1', ' Yanlış tutar girildi ').subscribe((r) => {
            expect(r).toBeUndefined();
            done();
        });
        const req = http.expectOne('http://api.test/api/v1/payments/p1/void');
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ reason: 'Yanlış tutar girildi' });
        req.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('409 zaten iptal: Türkçe mesajlı Error', (done) => {
        service.voidPayment('p1', 'Yanlış tutar').subscribe({
            error: (e: Error) => {
                expect(e.message).toContain('zaten iptal edilmiş');
                done();
            }
        });
        http.expectOne('http://api.test/api/v1/payments/p1/void').flush(
            { title: 'Conflict', extensions: { code: 'Payments.AlreadyVoided' } },
            { status: 409, statusText: 'Conflict' }
        );
    });
});
