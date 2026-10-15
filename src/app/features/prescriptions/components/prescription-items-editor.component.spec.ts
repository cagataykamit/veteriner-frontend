import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ProductService } from '@/app/features/inventory/services/product.service';
import { PrescriptionItemsEditorComponent } from '@/app/features/prescriptions/components/prescription-items-editor.component';
import {
    createPrescriptionItemGroup,
    createPrescriptionItemsArray,
    PRESCRIPTION_ITEMS_MAX,
    prescriptionItemsFormToInputs
} from '@/app/features/prescriptions/utils/prescription-items-form.utils';

const product = { id: 'pr1', name: 'Serum', sku: '—', categoryName: '—', unit: 'şişe', unitPriceText: '—', currency: 'TRY', isActive: true, statusLabel: 'Aktif', statusSeverity: 'success' };

describe('PrescriptionItemsEditorComponent', () => {
    let fixture: ComponentFixture<PrescriptionItemsEditorComponent>;
    let cmp: PrescriptionItemsEditorComponent;
    let claims: Set<string>;
    let getProducts: jasmine.Spy;
    const items = createPrescriptionItemsArray();

    const setup = async () => {
        getProducts = jasmine.createSpy('getProducts').and.returnValue(of({ items: [product], page: 1, pageSize: 200, totalItems: 1, totalPages: 1 }));
        await TestBed.configureTestingModule({
            imports: [PrescriptionItemsEditorComponent],
            providers: [
                { provide: ProductService, useValue: { getProducts } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(PrescriptionItemsEditorComponent);
        cmp = fixture.componentInstance;
        fixture.componentRef.setInput('items', items);
        fixture.detectChanges();
    };

    const el = () => fixture.nativeElement as HTMLElement;
    const rows = () => el().querySelectorAll('[data-testid="prescription-item-row"]');
    const click = (id: string) => (el().querySelector(`[data-testid="${id}"] button`) as HTMLButtonElement).click();

    beforeEach(() => {
        claims = new Set(['Products.Read']);
        items.clear();
    });

    it('satır yokken serbest metin açıklaması görünür', async () => {
        await setup();
        expect(rows().length).toBe(0);
        expect(el().querySelector('[data-testid="prescription-items-empty"]')).not.toBeNull();
    });

    it('satır ekle / sil çalışır', async () => {
        await setup();
        click('prescription-item-add');
        click('prescription-item-add');
        fixture.detectChanges();
        expect(items.length).toBe(2);
        expect(rows().length).toBe(2);
        click('prescription-item-remove');
        fixture.detectChanges();
        expect(items.length).toBe(1);
    });

    it(`en fazla ${PRESCRIPTION_ITEMS_MAX} satır eklenir`, async () => {
        for (let i = 0; i < PRESCRIPTION_ITEMS_MAX; i++) {
            items.push(createPrescriptionItemGroup({ name: `İlaç ${i}` }));
        }

        await setup();
        expect(el().querySelector('[data-testid="prescription-item-add"] button')?.hasAttribute('disabled')).toBeTrue();
        cmp.addRow();
        expect(items.length).toBe(PRESCRIPTION_ITEMS_MAX);
    });

    it('ad ve ürün ikisi de boşsa satır geçersiz; yalnız ad veya yalnız ürün geçerli', () => {
        const g = createPrescriptionItemGroup();

        expect(g.hasError('nameOrProductRequired')).toBeTrue();
        g.controls.name.setValue('Dış ilaç');
        expect(g.valid).toBeTrue();
        g.controls.name.setValue('');
        g.controls.productId.setValue('pr1');
        expect(g.valid).toBeTrue();
    });

    it('miktar 0, 4 ondalık veya çok büyükse geçersiz', () => {
        const g = createPrescriptionItemGroup({ name: 'X' });

        for (const q of [0, -2, 0.0001, 100001]) {
            g.controls.quantity.setValue(q);
            expect(g.controls.quantity.valid).withContext(String(q)).toBeFalse();
        }

        g.controls.quantity.setValue(14);
        expect(g.valid).toBeTrue();
    });

    it('ürün seçilince boş ad ürün adıyla dolar, dolu ad korunur; temizlenince bağ boşalır', async () => {
        await setup();
        const a = createPrescriptionItemGroup();

        a.controls.productId.setValue('pr1');
        cmp.onProductChange(a, 'pr1');
        expect(a.controls.name.value).toBe('Serum');
        const b = createPrescriptionItemGroup({ name: 'Özel ad' });

        cmp.onProductChange(b, 'pr1');
        expect(b.controls.name.value).toBe('Özel ad');
        b.controls.productId.setValue('pr1');
        cmp.onProductChange(b, null);
        expect(b.controls.productId.value).toBe('');
    });

    it('Products.Read yoksa ürün listesi yüklenmez (yalnız serbest ad)', async () => {
        claims.clear();
        await setup();
        expect(getProducts).not.toHaveBeenCalled();
        expect(cmp.canPickProduct).toBeFalse();
    });

    it('istek satırları kırpılır; ürün bağı olmayan satır productId null gönderir', () => {
        const arr = createPrescriptionItemsArray([{ name: ' Amoksisilin ', productId: null, instructions: ' 2x1 ', quantity: 14 }]);

        expect(prescriptionItemsFormToInputs(arr)).toEqual([{ name: 'Amoksisilin', productId: null, instructions: '2x1', quantity: 14 }]);
    });
});
