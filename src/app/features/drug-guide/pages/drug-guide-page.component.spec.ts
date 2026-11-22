import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { LicensedProductVm } from '@/app/entities/drug-guide/models/drug-guide.model';
import { DrugGuideService } from '@/app/entities/drug-guide/services/drug-guide.service';
import { DrugGuidePageComponent } from './drug-guide-page.component';

const product = (over: Partial<LicensedProductVm> = {}): LicensedProductVm => ({
    id: 'lp1',
    name: 'ÖRNEK Meloksikam Süspansiyon',
    activeIngredients: [{ id: 'ing1', name: 'Meloksikam' }],
    targetSpecies: ['Köpek'],
    licenseHolder: 'Örnek İlaç A.Ş.',
    licenseNumber: 'R-1',
    spcUrl: 'https://ornek.gov.tr/oz.pdf',
    isListedInSource: true,
    source: 'ÖRNEK',
    sourceSyncedAtUtc: '2026-11-20T09:00:00Z',
    ...over
});

describe('DrugGuidePageComponent', () => {
    const setup = (productCount: number, canReadStock = true) => {
        const service = {
            getSummary: vi.fn().mockReturnValue(of({ productCount, ingredientCount: 1, lastSyncedAtUtc: productCount ? '2026-11-20T09:00:00Z' : null })),
            searchProducts: vi.fn().mockReturnValue(of({ items: [product(), product({ id: 'lp2', name: 'ÖRNEK Eski Ürün', isListedInSource: false, spcUrl: null })], page: 1, pageSize: 20, totalItems: 2, totalPages: 1 })),
            getIngredientStockProducts: vi
                .fn()
                .mockReturnValue(of([{ productId: 'p1', productName: 'Klinik meloksikam', unit: 'Şişe', isActive: true, licensedProductId: 'lp1', licensedProductName: 'ÖRNEK Meloksikam Süspansiyon', quantityOnHand: 3 }]))
        };

        TestBed.configureTestingModule({
            imports: [DrugGuidePageComponent],
            providers: [provideRouter([]), { provide: DrugGuideService, useValue: service }, { provide: AuthService, useValue: { hasOperationClaim: () => canReadStock } }]
        });
        const fixture = TestBed.createComponent(DrugGuidePageComponent);

        fixture.detectChanges();

        return { fixture, service, el: fixture.nativeElement as HTMLElement };
    };

    it('katalog boşken boş durum gösterir ve arama yapmaz', () => {
        const { el, service } = setup(0);

        expect(el.querySelector('[data-testid="drug-guide-empty"]')?.textContent).toContain('İlaç rehberi henüz boş');
        expect(service.searchProducts).not.toHaveBeenCalled();
    });

    it('kaynak notu, olgu alanları ve kaynaktan düşen ürün işareti; tanı ya da yüzde ifadesi yok', () => {
        const { el } = setup(2);
        const text = el.textContent ?? '';

        expect(el.querySelector('[data-testid="drug-guide-source-note"]')?.textContent).toContain('Klinik karar hekime aittir');
        expect(el.querySelectorAll('[data-testid="drug-guide-result"]').length).toBe(2);
        expect(text).toContain('Örnek İlaç A.Ş.');
        expect(text).toContain('Ruhsat listesinde artık yok');
        expect(el.querySelector('a[href="https://ornek.gov.tr/oz.pdf"]')?.getAttribute('rel')).toContain('noopener');
        expect(text).not.toMatch(/teşhis|%/i);
    });

    it('etken maddeye tıklayınca o maddeyle aranır ve stoktaki ürünler gösterilir', () => {
        const { fixture, el, service } = setup(2);

        (el.querySelector('[aria-label="Meloksikam içeren ürünleri göster"]') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(service.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ activeIngredientId: 'ing1' }));
        expect(service.getIngredientStockProducts).toHaveBeenCalledWith('ing1');
        expect(el.querySelector('[data-testid="drug-guide-stock"]')?.textContent).toContain('Klinik meloksikam');
    });

    it('stok izni yoksa stok bölümü yok', () => {
        const { fixture, el, service } = setup(2, false);

        (el.querySelector('[aria-label="Meloksikam içeren ürünleri göster"]') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(service.getIngredientStockProducts).not.toHaveBeenCalled();
        expect(el.querySelector('[data-testid="drug-guide-stock"]')).toBeNull();
    });
});
