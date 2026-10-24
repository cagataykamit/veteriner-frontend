import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClinicsService } from '@/app/features/clinics/services/clinics.service';
import { GoodsReceiptPageComponent } from '@/app/features/inventory/pages/goods-receipt-page/goods-receipt-page.component';
import type { CreateGoodsReceiptRequest } from '@/app/features/inventory/models/goods-receipt-api.model';
import { GoodsReceiptSubmitError, type GoodsReceiptProductPick } from '@/app/features/inventory/models/goods-receipt-form.model';
import { GoodsReceiptService } from '@/app/features/inventory/services/goods-receipt.service';
import { ProductService } from '@/app/features/inventory/services/product.service';
import type { ProductDetailVm } from '@/app/features/inventory/models/product-vm.model';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';

const plain: GoodsReceiptProductPick = { id: 'p1', label: 'Serum (S1)', barcode: '869', requiresLotAndExpiry: false };
const vaccine: GoodsReceiptProductPick = { id: 'p2', label: 'Kuduz aşısı (V1)', barcode: '', requiresLotAndExpiry: true };

describe('GoodsReceiptPageComponent', () => {
    let fixture: ComponentFixture<GoodsReceiptPageComponent>;
    let cmp: GoodsReceiptPageComponent;
    let service: jasmine.SpyObj<GoodsReceiptService>;
    let products: jasmine.SpyObj<ProductService>;

    const setup = async (query: Record<string, string> = {}) => {
        service = jasmine.createSpyObj<GoodsReceiptService>('GoodsReceiptService', ['create']);
        products = jasmine.createSpyObj<ProductService>('ProductService', ['getProducts', 'getById']);
        products.getById.and.returnValue(
            of({ id: 'p1', name: 'Serum', sku: 'S1', barcode: '869', requiresLotAndExpiry: false } as unknown as ProductDetailVm)
        );
        await TestBed.configureTestingModule({
            imports: [GoodsReceiptPageComponent],
            providers: [
                provideRouter([]),
                { provide: GoodsReceiptService, useValue: service },
                { provide: ProductService, useValue: products },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                { provide: ClinicsService, useValue: { listClinics: () => of([{ id: 'c1', name: 'Merkez', isActive: true }]) } },
                { provide: AuthService, useValue: { getClinicId: () => 'c1', getClinicName: () => 'Merkez' } },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(GoodsReceiptPageComponent);
        cmp = fixture.componentInstance;
        fixture.detectChanges();
    };

    const fillFirstLine = (product: GoodsReceiptProductPick, extra: Record<string, unknown> = {}) =>
        cmp.lines.at(0).patchValue({ product, quantity: 2, ...extra });

    it('düşük stok kısayolu: ürün ve önerilen miktar ilk satıra ön dolu gelir', async () => {
        await setup({ productId: 'p1', quantity: '7' });
        expect(products.getById).toHaveBeenCalledWith('p1');
        const v = cmp.lines.at(0).getRawValue();

        expect((v.product as GoodsReceiptProductPick).id).toBe('p1');
        expect(v.quantity).toBe(7);
        expect(cmp.form.controls.clinicId.value).toBe('c1');
    });

    it('aşı satırında seri+SKT yoksa gönderilmez; geçmiş SKT onaysızsa gönderilmez, onaylı gönderilir', async () => {
        await setup();
        service.create.and.returnValue(of({ created: true, lineCount: 1 }));
        fillFirstLine(vaccine);
        cmp.onSubmit();
        expect(service.create).not.toHaveBeenCalled();
        expect(cmp.lines.at(0).hasError('lotRequired')).toBeTrue();

        cmp.lines.at(0).patchValue({ lotNumber: 'L1', expiryDate: '2020-01-01' });
        cmp.onSubmit();
        expect(service.create).not.toHaveBeenCalled();
        expect(cmp.lines.at(0).hasError('expiredNotAcknowledged')).toBeTrue();

        cmp.lines.at(0).patchValue({ acknowledgeExpired: true });
        cmp.onSubmit();
        const sent = service.create.calls.mostRecent().args[0] as CreateGoodsReceiptRequest;

        expect(sent.lines[0]).toEqual(jasmine.objectContaining({ productId: 'p2', lotNumber: 'L1', expiryDate: '2020-01-01', acknowledgeExpired: true }));
    });

    it('hata sonrası form korunur ve yeniden gönderim aynı requestId ile gider; hata satıra yansır', async () => {
        await setup();
        service.create.and.returnValues(
            throwError(() => new GoodsReceiptSubmitError('Satır 1 kaydedilemedi. Hiçbir satır kaydedilmedi.', { 0: 'Ürün pasif.' })),
            of({ created: true, lineCount: 1 })
        );
        fillFirstLine(plain);
        cmp.onSubmit();
        expect(cmp.submitError()).toContain('Hiçbir satır kaydedilmedi');
        expect(cmp.result()).toBeNull();
        expect(cmp.lines.at(0).getRawValue().quantity).toBe(2);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[data-testid="gr-row-notes-0"]')?.textContent).toContain('Ürün pasif.');

        cmp.onSubmit();
        const [first, second] = service.create.calls.allArgs().map((a) => a[0] as CreateGoodsReceiptRequest);

        expect(second.requestId).toBe(first.requestId);
        expect(cmp.result()).toEqual({ created: true, lineCount: 1 });
    });

    it('başarıdan sonra yeni mal kabul yeni requestId üretir', async () => {
        await setup();
        service.create.and.returnValue(of({ created: false, lineCount: 1 }));
        fillFirstLine(plain);
        cmp.onSubmit();
        const first = (service.create.calls.mostRecent().args[0] as CreateGoodsReceiptRequest).requestId;

        cmp.startNew();
        fillFirstLine(plain);
        cmp.onSubmit();
        expect((service.create.calls.mostRecent().args[0] as CreateGoodsReceiptRequest).requestId).not.toBe(first);
    });

    it('satır sayısı 100 ile sınırlıdır; son satır silinmez', async () => {
        await setup();

        for (let i = 0; i < 150; i++) {
            cmp.addLine();
        }

        expect(cmp.lines.length).toBe(100);

        while (cmp.lines.length > 1) {
            cmp.removeLine(0);
        }

        cmp.removeLine(0);
        expect(cmp.lines.length).toBe(1);
    });
});
