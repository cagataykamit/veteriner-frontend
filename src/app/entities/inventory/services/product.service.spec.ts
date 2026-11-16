import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import type { ProductDto } from '@/app/entities/inventory/models/product-api.model';
import { ProductService } from '@/app/entities/inventory/services/product.service';

const dto = (over: Partial<ProductDto>): ProductDto => ({ id: 'p', name: 'Ürün', unitPrice: 100, currency: 'TRY', isActive: true, kind: 'Other', vatRate: null, ...over });

describe('ProductService.searchChargeCatalog', () => {
    let service: ProductService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }, { provide: AuthService, useValue: { getClinicId: () => 'c1' } }]
        });
        service = TestBed.inject(ProductService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('ada göre aktif kalemleri ister; hizmetler önce, fiyat ve KDV sayısal (O10)', () =>
        new Promise<void>((done) => {
            service.searchChargeCatalog('mu').subscribe((items) => {
                expect(items.map((i) => i.id)).toEqual(['s1', 'p1']);
                expect(items[0]).toEqual(expect.objectContaining({ name: 'Genel muayene', kind: 'Service', unitPrice: 900, vatRate: 10 }));
                expect(items[1]).toEqual(expect.objectContaining({ kind: 'Other', unitPrice: 45.5, vatRate: null }));
                done();
            });
            const req = http.expectOne((r) => r.url === 'http://api.test/api/v1/products');

            expect(req.request.params.get('Search')).toBe('mu');
            expect(req.request.params.get('IsActive')).toBe('true');
            expect(req.request.params.get('PageSize')).toBe('6');
            req.flush({
                items: [dto({ id: 'p1', name: 'Mama', unitPrice: '45.5' }), dto({ id: 's1', name: 'Genel muayene', kind: 'Service', unitPrice: 900, vatRate: '10' }), dto({ id: 'x', name: ' ' })],
                page: 1,
                pageSize: 6,
                totalItems: 3,
                totalPages: 1
            });
        }));
});
