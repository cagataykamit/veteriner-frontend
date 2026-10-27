import { HttpErrorResponse, provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import type { SaleDto } from '@/app/features/sales/models/sale-api.model';
import { SaleProductSearchService } from '@/app/features/sales/services/sale-product-search.service';
import { SalesService } from '@/app/features/sales/services/sales.service';

const saleDto: SaleDto = {
    id: 's1',
    clinicId: 'c1',
    clientId: 'w1',
    clientName: 'Peşin müşteri',
    isWalkIn: true,
    status: 'Active',
    soldAtUtc: '2026-10-14T08:00:00Z',
    totalAmount: 91,
    paidAmount: 91,
    outstandingAmount: 0,
    lines: []
};

const request = { requestId: 'rid-1', lines: [{ productId: 'p1', quantity: 2, unitPrice: 45.5 }], payment: { method: 'Cash' as const, amount: 91 } };

describe('SalesService', () => {
    let service: SalesService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }, { provide: AuthService, useValue: { getClinicId: () => 'c1' } }]
        });
        service = TestBed.inject(SalesService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('liste: aktif klinik clinicId olarak gider, iptaller varsayılan olarak istenmez', () =>
        new Promise<void>((done) => {
            service.getSales({ page: 1, pageSize: 20 }).subscribe((r) => {
                expect(r.items[0].clientName).toBe('Peşin müşteri');
                done();
            });
            const req = http.expectOne((r) => r.url === 'http://api.test/api/v1/sales');

            expect(req.request.method).toBe('GET');
            expect(req.request.params.get('clinicId')).toBe('c1');
            expect(req.request.params.has('includeVoided')).toBe(false);
            req.flush({ items: [saleDto], page: 1, pageSize: 20, totalItems: 1, totalPages: 1 });
        }));

    it('oluşturma: requestId ile gönderir, 201 created:true döner', () =>
        new Promise<void>((done) => {
            service.createSale(request).subscribe((r) => {
                expect(r.created).toBe(true);
                expect(r.sale.id).toBe('s1');
                done();
            });
            const req = http.expectOne('http://api.test/api/v1/sales');

            expect(req.request.method).toBe('POST');
            expect(req.request.body.requestId).toBe('rid-1');
            req.flush({ created: true, sale: saleDto, stocks: [] }, { status: 201, statusText: 'Created' });
        }));

    it('aynı requestId ile tekrar: 200 created:false başarı sayılır', () =>
        new Promise<void>((done) => {
            service.createSale(request).subscribe({
                next: (r) => {
                    expect(r.created).toBe(false);
                    expect(r.sale.id).toBe('s1');
                    done();
                },
                error: () => expect.fail('başarı beklenirdi')
            });
            http.expectOne('http://api.test/api/v1/sales').flush({ created: false, sale: saleDto, stocks: [] }, { status: 200, statusText: 'OK' });
        }));

    it('oluşturma hatası: Sales.InsufficientStock backend ayrıntısını gösterir', () =>
        new Promise<void>((done) => {
            service.createSale(request).subscribe({
                error: (e: Error) => {
                    expect(e.message).toBe('Kullanılabilir 3 adet, süresi geçmiş 2 adet.');
                    done();
                }
            });
            http.expectOne('http://api.test/api/v1/sales').flush({ detail: 'Kullanılabilir 3 adet, süresi geçmiş 2 adet.', extensions: { code: 'Sales.InsufficientStock' } }, { status: 400, statusText: 'Bad Request' });
        }));

    it.each([
        ['StockMovements.ConcurrencyConflict', 'Stok aynı anda başka bir işlemle değişti. Tekrar deneyin; aynı satış iki kez yazılmaz.'],
        ['StockBatches.NotFound', 'Seçilen parti bulunamadı. Partiyi yeniden seçin.']
    ])('oluşturma hatası: başka ekranlarla ortak %s kodunda satışın kendi metni gösterilir', (code, expected) =>
        new Promise<void>((done) => {
            service.createSale(request).subscribe({
                error: (e: Error) => {
                    expect(e.message).toBe(expected);
                    done();
                }
            });
            http.expectOne('http://api.test/api/v1/sales').flush({ extensions: { code } }, { status: 409, statusText: 'Conflict' });
        }));

    it('iptal: gerekçe kırpılır, stok sonucu gönderilir, güncel satış döner', () =>
        new Promise<void>((done) => {
            service.voidSale('s1', { reason: '  Yanlış ürün  ', stockOutcome: 'WrittenOff' }).subscribe((s) => {
                expect(s.isVoided).toBe(true);
                done();
            });
            const req = http.expectOne('http://api.test/api/v1/sales/s1/void');

            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ reason: 'Yanlış ürün', stockOutcome: 'WrittenOff' });
            req.flush({ ...saleDto, status: 'Voided' });
        }));

    it('iptal: veresiye ödemesi tahsisli ise Charges.VoidBlockedByAllocation mesajı gösterilir', () =>
        new Promise<void>((done) => {
            service.voidSale('s1', { reason: 'Yanlış ürün', stockOutcome: 'StockReturned' }).subscribe({
                error: (e: Error) => {
                    expect(e.message).toContain('ödeme bağlı olduğu için iptal edilemez');
                    done();
                }
            });
            http.expectOne('http://api.test/api/v1/sales/s1/void').flush({ extensions: { code: 'Charges.VoidBlockedByAllocation' } }, { status: 409, statusText: 'Conflict' });
        }));

    it('iptal: zaten iptalse Sales.AlreadyVoided Türkçe mesaj verir', () =>
        new Promise<void>((done) => {
            service.voidSale('s1', { reason: 'Yanlış ürün', stockOutcome: 'StockReturned' }).subscribe({
                error: (e: Error) => {
                    expect(e.message).toBe('Bu satış zaten iptal edilmiş. Sayfayı yenileyin.');
                    expect(e).not.toBeInstanceOf(HttpErrorResponse);
                    done();
                }
            });
            http.expectOne('http://api.test/api/v1/sales/s1/void').flush({ extensions: { code: 'Sales.AlreadyVoided' } }, { status: 409, statusText: 'Conflict' });
        }));
});

describe('SaleProductSearchService', () => {
    let service: SaleProductSearchService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
        });
        service = TestBed.inject(SaleProductSearchService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('aktif ürünlerde arar; aşı ve kontrollü ürünleri sonuçtan süzer', () =>
        new Promise<void>((done) => {
            service.search(' 8690 ').subscribe((r) => {
                expect(r.map((p) => p.id)).toEqual(['p1', 'p2']);
                done();
            });
            const req = http.expectOne((r) => r.url === 'http://api.test/api/v1/products');

            expect(req.request.params.get('Search')).toBe('8690');
            expect(req.request.params.get('IsActive')).toBe('true');
            req.flush({
                items: [
                    { id: 'p1', name: 'Mama', unitPrice: 10, kind: 'Other', controlledClass: 'None' },
                    { id: 'v1', name: 'Kuduz aşısı', unitPrice: 10, kind: 'Vaccine', controlledClass: 'None' },
                    { id: 'n1', name: 'Ketamin', unitPrice: 10, kind: 'Medicine', controlledClass: 'Narcotic' },
                    { id: 'p2', name: 'Şampuan', unitPrice: 10, kind: 'Medicine', controlledClass: 'None' }
                ],
                page: 1,
                pageSize: 12,
                totalItems: 4,
                totalPages: 1
            });
        }));
});
