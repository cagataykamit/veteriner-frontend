import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import type { LicensedProductVm, ProductDrugInfoVm } from '@/app/entities/drug-guide/models/drug-guide.model';
import { DrugGuideService } from '@/app/entities/drug-guide/services/drug-guide.service';
import { ProductDrugGuideLinkComponent } from './product-drug-guide-link.component';
import { ProductDrugInfoNoteComponent } from './product-drug-info-note.component';

const info = (over: Partial<ProductDrugInfoVm> = {}): ProductDrugInfoVm => ({
    productId: 'p1',
    licensedProductId: 'lp1',
    licensedProductName: 'ÖRNEK Tablet',
    activeIngredients: [
        { id: 'i1', name: 'Amoksisilin' },
        { id: 'i2', name: 'Klavulanik asit' }
    ],
    targetSpecies: ['Köpek'],
    notLicensedForPetSpecies: true,
    petSpeciesName: 'Kedi',
    ...over
});

const licensed: LicensedProductVm = {
    id: 'lp1',
    name: 'ÖRNEK Tablet',
    activeIngredients: [{ id: 'i1', name: 'Amoksisilin' }],
    targetSpecies: ['Köpek'],
    licenseHolder: 'Örnek A.Ş.',
    licenseNumber: null,
    spcUrl: null,
    isListedInSource: true,
    source: 'ÖRNEK',
    sourceSyncedAtUtc: '2026-11-20T09:00:00Z'
};

describe('ProductDrugInfoNoteComponent', () => {
    const render = (rows: ProductDrugInfoVm[], productId: string | null = 'p1') => {
        const service = { getProductInfo: vi.fn().mockReturnValue(of(rows)) };

        TestBed.configureTestingModule({
            imports: [ProductDrugInfoNoteComponent],
            providers: [{ provide: DrugGuideService, useValue: service }]
        });
        const fixture = TestBed.createComponent(ProductDrugInfoNoteComponent);

        fixture.componentRef.setInput('productId', productId);
        fixture.componentRef.setInput('petId', 'pet1');
        fixture.detectChanges();

        return { el: fixture.nativeElement as HTMLElement, service };
    };

    it('etken maddeyi ve engellemeyen hedef tür notunu gösterir', () => {
        const { el, service } = render([info()]);

        expect(service.getProductInfo).toHaveBeenCalledWith(['p1'], 'pet1');
        expect(el.textContent).toContain('Etken madde: Amoksisilin, Klavulanik asit');
        expect(el.querySelector('[data-testid="product-species-note"]')?.textContent).toContain('Bu ürün ruhsatında Kedi için kayıtlı değil');
    });

    it('tür ruhsattaysa ya da bilinmiyorsa not yok', () => {
        const { el } = render([info({ notLicensedForPetSpecies: null })]);

        expect(el.textContent).toContain('Etken madde');
        expect(el.querySelector('[data-testid="product-species-note"]')).toBeNull();
    });

    it('rehbere bağlı olmayan ürün ya da boş seçimde hiçbir şey göstermez', () => {
        expect(render([]).el.querySelector('[data-testid="product-drug-info"]')).toBeNull();
        TestBed.resetTestingModule();
        const empty = render([info()], null);

        expect(empty.service.getProductInfo).not.toHaveBeenCalled();
        expect(empty.el.querySelector('[data-testid="product-drug-info"]')).toBeNull();
    });
});

describe('ProductDrugGuideLinkComponent', () => {
    const setup = (licensedProductId: string | null) => {
        const service = {
            getProduct: vi.fn().mockReturnValue(of(licensed)),
            searchProducts: vi.fn().mockReturnValue(of({ items: [licensed], page: 1, pageSize: 8, totalItems: 1, totalPages: 1 })),
            linkProduct: vi.fn().mockReturnValue(of(void 0))
        };

        TestBed.configureTestingModule({ imports: [ProductDrugGuideLinkComponent], providers: [{ provide: DrugGuideService, useValue: service }] });
        const fixture = TestBed.createComponent(ProductDrugGuideLinkComponent);

        fixture.componentRef.setInput('productId', 'p1');
        fixture.componentRef.setInput('productName', 'Klinik tablet');
        fixture.componentRef.setInput('licensedProductId', licensedProductId);
        fixture.componentRef.setInput('canEdit', true);
        fixture.detectChanges();

        return { fixture, service, el: fixture.nativeElement as HTMLElement };
    };

    it('bağsız üründe adla arar, seçilen kaydı onayla bağlar', () => {
        const { fixture, service, el } = setup(null);

        expect(el.querySelector('[data-testid="drug-guide-unlinked"]')).not.toBeNull();
        (el.querySelector('[data-testid="drug-guide-link-open"]') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(service.searchProducts).toHaveBeenCalledWith(expect.objectContaining({ search: 'Klinik tablet', field: 'Product' }));
        (el.querySelector('[data-testid="drug-guide-link-pick"]') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(service.linkProduct).toHaveBeenCalledWith('p1', 'lp1');
        expect(el.querySelector('[data-testid="drug-guide-linked"]')?.textContent).toContain('ÖRNEK Tablet');
    });

    it('bağlı ürünü gösterir ve bağı kaldırır', () => {
        const { fixture, service, el } = setup('lp1');

        expect(service.getProduct).toHaveBeenCalledWith('lp1');
        expect(el.querySelector('[data-testid="drug-guide-linked"]')?.textContent).toContain('Örnek A.Ş.');
        (el.querySelector('[data-testid="drug-guide-unlink"]') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(service.linkProduct).toHaveBeenCalledWith('p1', null);
        expect(el.querySelector('[data-testid="drug-guide-unlinked"]')).not.toBeNull();
    });
});
