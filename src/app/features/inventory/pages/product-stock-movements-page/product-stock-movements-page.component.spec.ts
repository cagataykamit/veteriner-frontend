import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import { ProductService } from '@/app/entities/inventory/services/product.service';
import { StockMovementService } from '@/app/features/inventory/services/stock-movement.service';
import { ProductStockMovementsPageComponent } from './product-stock-movements-page.component';

const P1_KEY = 'panel:inventory:product-stock-movements:p1:listState';
const P2_KEY = 'panel:inventory:product-stock-movements:p2:listState';

describe('ProductStockMovementsPageComponent — liste durumu', () => {
    const create = (getById = vi.fn().mockReturnValue(of({ name: 'Serum', sku: 'S-1' }))) => {
        const listByProductId = vi
            .fn()
            .mockName('listByProductId')
            .mockImplementation((_id: string, q: { page: number; pageSize: number }) => of({ items: [], page: q.page, pageSize: q.pageSize, totalItems: 0, totalPages: 0 }));

        TestBed.configureTestingModule({
            imports: [ProductStockMovementsPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'p1' })) } },
                { provide: StockMovementService, useValue: { listByProductId } },
                { provide: ProductService, useValue: { getById } },
                { provide: ClinicsService, useValue: { listClinics: () => of([]) } },
                { provide: AuthService, useValue: { hasOperationClaim: () => false } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const fixture = TestBed.createComponent(ProductStockMovementsPageComponent);

        fixture.detectChanges();

        return { fixture, listByProductId, cmp: fixture.componentInstance };
    };

    beforeEach(() => {
        sessionStorage.removeItem(P1_KEY);
        sessionStorage.removeItem(P2_KEY);
    });
    afterEach(() => {
        sessionStorage.removeItem(P1_KEY);
        sessionStorage.removeItem(P2_KEY);
    });

    it('rotadaki ürünün saklanan süzgeç ve sayfasıyla yükler; başka ürünün kaydı kullanılmaz', () => {
        sessionStorage.setItem(P1_KEY, JSON.stringify({ movementType: 'In', dateFrom: '2026-10-01', dateTo: '', page: 2, pageSize: 20 }));
        sessionStorage.setItem(P2_KEY, JSON.stringify({ movementType: 'Out', dateFrom: '', dateTo: '', page: 5, pageSize: 50 }));

        const { listByProductId, cmp } = create();

        expect(listByProductId).toHaveBeenCalledTimes(1);
        expect(listByProductId).toHaveBeenCalledWith('p1', { page: 2, pageSize: 20, movementType: 'In', dateFromUtc: '2026-10-01', dateToUtc: undefined });
        expect(cmp.productLabel()).toBe('Serum (S-1)');
        expect(cmp.movementTypeFilter).toBe('In');
        expect(cmp.first()).toBe(20);
    });

    it('süzgeç uygulanınca ilk sayfa istenir ve ürünün anahtarına saklanır', () => {
        sessionStorage.setItem(P1_KEY, JSON.stringify({ movementType: '', dateFrom: '', dateTo: '', page: 3, pageSize: 10 }));

        const { listByProductId, cmp } = create();

        cmp.movementTypeFilter = 'Out';
        cmp.applyFilters();

        expect(listByProductId).toHaveBeenLastCalledWith('p1', { page: 1, pageSize: 10, movementType: 'Out', dateFromUtc: undefined, dateToUtc: undefined });
        expect(JSON.parse(sessionStorage.getItem(P1_KEY)!)).toEqual({ movementType: 'Out', dateFrom: '', dateTo: '', page: 1, pageSize: 10 });
    });

    it('süzgeçler temizlenince saklanan kayıt silinir ve ilk sayfa yüklenir', () => {
        sessionStorage.setItem(P1_KEY, JSON.stringify({ movementType: 'In', dateFrom: '', dateTo: '', page: 2, pageSize: 10 }));

        const { listByProductId, cmp } = create();

        cmp.resetFilters();

        expect(listByProductId).toHaveBeenLastCalledWith('p1', { page: 1, pageSize: 10, movementType: undefined, dateFromUtc: undefined, dateToUtc: undefined });
        expect(cmp.movementTypeFilter).toBe('');
        // Yükleme yanıtı konumu yeniden saklar (süzgeçsiz ilk sayfa).
        expect(JSON.parse(sessionStorage.getItem(P1_KEY)!)).toEqual({ movementType: '', dateFrom: '', dateTo: '', page: 1, pageSize: 10 });
    });

    it('ürün bilgisi alınamazsa liste yine yüklenir', () => {
        const { listByProductId, cmp } = create(vi.fn().mockReturnValue(throwError(() => new Error('404'))));

        expect(cmp.productLabel()).toBeNull();
        expect(listByProductId).toHaveBeenCalledTimes(1);
        expect(cmp.loading()).toBe(false);
        expect(cmp.error()).toBeNull();
    });
});
