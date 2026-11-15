import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ProductService } from '@/app/entities/inventory/services/product.service';
import { type QuickProductCreated, QuickProductDialogComponent } from './quick-product-dialog.component';

describe('QuickProductDialogComponent (O1)', () => {
    let fixture: ComponentFixture<QuickProductDialogComponent>;
    let cmp: QuickProductDialogComponent;
    const createFromFormValue = vi.fn();

    beforeEach(() => {
        createFromFormValue.mockReset();
        TestBed.configureTestingModule({
            imports: [QuickProductDialogComponent],
            providers: [
                { provide: ProductService, useValue: { createFromFormValue } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        fixture = TestBed.createComponent(QuickProductDialogComponent);
        cmp = fixture.componentInstance;
        fixture.componentRef.setInput('initialName', ' Kuduz aşısı ');
        fixture.componentRef.setInput('kinds', ['Vaccine']);
        fixture.detectChanges();
        cmp.onShow();
    });

    it('seçicide yazılan adı ve ilk türü taşır; dolu sayılır', () => {
        expect(cmp.form.controls.name.value).toBe('Kuduz aşısı');
        expect(cmp.form.controls.kind.value).toBe('Vaccine');
        expect(cmp.form.controls.unit.value).toBe('Adet');
        expect(cmp.form.dirty).toBe(true);
    });

    it('fiyat boşsa kaydetmez ve eksik alanı söyler', () => {
        cmp.onSubmit();
        cmp.form.markAllAsTouched();

        expect(createFromFormValue).not.toHaveBeenCalled();
        expect(cmp.message('unitPrice')).toContain('Satış fiyatını');
    });

    it('kayıtta ürünü oluşturur, sonucu yayar ve kapanır', () => {
        const created: QuickProductCreated[] = [];

        createFromFormValue.mockReturnValue(of('p9'));
        cmp.productCreated.subscribe((p) => created.push(p));
        cmp.visible.set(true);
        cmp.form.controls.unitPrice.setValue(150);
        cmp.onSubmit();

        expect(createFromFormValue).toHaveBeenCalledWith(expect.objectContaining({ name: 'Kuduz aşısı', kind: 'Vaccine', unit: 'Adet', unitPrice: 150, currency: 'TRY' }));
        expect(created).toEqual([{ id: 'p9', name: 'Kuduz aşısı', kind: 'Vaccine', unit: 'Adet', unitPrice: 150 }]);
        expect(cmp.visible()).toBe(false);
        expect(cmp.form.dirty).toBe(false);
    });

    it('sunucu hatasında diyalog açık kalır ve mesaj gösterir', () => {
        createFromFormValue.mockReturnValue(throwError(() => new Error('Ürün oluşturulamadı.')));
        cmp.visible.set(true);
        cmp.form.controls.unitPrice.setValue(0);
        cmp.onSubmit();

        expect(cmp.submitError()).toBe('Ürün oluşturulamadı.');
        expect(cmp.visible()).toBe(true);
    });
});
