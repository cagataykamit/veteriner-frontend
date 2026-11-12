import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { mapProductUpsertFormValueToUpdateRequest } from '@/app/entities/inventory/data/product.mapper';
import type { ProductDto } from '@/app/entities/inventory/models/product-api.model';
import type { ProductUpsertFormValue } from '@/app/entities/inventory/models/product-upsert-form.model';
import { ProductService } from '@/app/entities/inventory/services/product.service';
import { ProductCategoryService } from '@/app/features/inventory/services/product-category.service';
import { ProductEditPageComponent } from './product-edit-page.component';

const dto = (over: Partial<ProductDto> = {}): ProductDto => ({
    id: 'p1',
    name: 'Serum',
    unit: 'Şişe',
    unitPrice: 120,
    currency: 'TRY',
    isActive: true,
    kind: 'Medicine',
    controlledClass: 'None',
    vatRate: 18,
    purchasePrice: 50,
    ...over
});

describe('ProductEditPageComponent KDV oranı ve alış fiyatı', () => {
    let fixture: ComponentFixture<ProductEditPageComponent>;
    let products: { getDtoById: ReturnType<typeof vi.fn>; updateFromFormValue: ReturnType<typeof vi.fn> };

    const el = () => fixture.nativeElement as HTMLElement;
    const input = (id: string) => el().querySelector(`#${id}`) as HTMLInputElement;

    const render = (product: ProductDto) => {
        products = { getDtoById: vi.fn().mockReturnValue(of(product)), updateFromFormValue: vi.fn().mockReturnValue(NEVER) };
        TestBed.configureTestingModule({
            imports: [ProductEditPageComponent],
            providers: [
                provideRouter([]),
                { provide: ProductService, useValue: products },
                { provide: ProductCategoryService, useValue: { list: () => NEVER } },
                { provide: AuthService, useValue: { hasOperationClaim: () => false } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: signal(false), lockedPlanFeature: () => null } },
                { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'p1' })), snapshot: { paramMap: convertToParamMap({ id: 'p1' }) } } }
            ]
        });
        fixture = TestBed.createComponent(ProductEditPageComponent);
        fixture.detectChanges();
    };

    const submit = (): ProductUpsertFormValue | undefined => {
        (el().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
        fixture.detectChanges();

        return products.updateFromFormValue.mock.calls[0]?.[1] as ProductUpsertFormValue | undefined;
    };

    afterEach(() => fixture?.destroy());

    it('kayıtlı listede olmayan oran (%18) ve alış fiyatı forma gelir; ipucu bilgi amaçlı', () => {
        render(dto());

        expect(el().textContent).toContain('%18');
        expect(input('productEditPurchasePrice').value).toBe('50');
        expect(el().textContent).toContain('Bilgi amaçlıdır');
    });

    it('alış fiyatı boşaltılınca PUT clearPurchasePrice true, KDV değeri korunur', () => {
        render(dto());
        const price = input('productEditPurchasePrice');

        price.value = '';
        price.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        const value = submit();

        expect(products.updateFromFormValue).toHaveBeenCalledWith('p1', expect.objectContaining({ vatRate: 18, purchasePrice: null }));
        expect(mapProductUpsertFormValueToUpdateRequest(value!)).toEqual(expect.objectContaining({ vatRate: 18, clearVatRate: false, purchasePrice: null, clearPurchasePrice: true }));
    });

    it('oranı boş ürün "Klinik varsayılanı" gösterir; kayıtta clearVatRate true gider', () => {
        render(dto({ vatRate: null, purchasePrice: null }));

        expect(el().textContent).toContain('Klinik varsayılanı');
        expect(mapProductUpsertFormValueToUpdateRequest(submit()!)).toEqual(expect.objectContaining({ vatRate: null, clearVatRate: true }));
    });

    it('negatif alış fiyatı kaydı engeller', () => {
        render(dto());
        const price = input('productEditPurchasePrice');

        price.value = '-1';
        price.dispatchEvent(new Event('input'));
        price.dispatchEvent(new Event('blur'));
        fixture.detectChanges();

        expect(el().textContent).toContain('0 veya daha büyük');
        submit();
        expect(products.updateFromFormValue).not.toHaveBeenCalled();
    });
});
