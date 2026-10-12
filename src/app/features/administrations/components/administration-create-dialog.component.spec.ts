import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AdministrationCreateDialogComponent } from '@/app/features/administrations/components/administration-create-dialog.component';
import type { AdministrationCreateResultVm } from '@/app/features/administrations/models/administration-vm.model';
import { AdministrationsService } from '@/app/features/administrations/services/administrations.service';
import { ProductService } from '@/app/features/inventory/services/product.service';

const product = { id: 'pr1', name: 'Serum', sku: 'SRM-1', categoryName: '—', unit: 'şişe', unitPriceText: '—', currency: 'TRY', isActive: true, statusLabel: 'Aktif', statusSeverity: 'success' };

const result = (created: boolean): AdministrationCreateResultVm => ({
    created,
    administration: {
        id: 'a1',
        petId: 'p1',
        examinationId: 'e1',
        treatmentId: null,
        productId: 'pr1',
        productName: 'Serum',
        productSku: null,
        unit: 'şişe',
        quantity: 0.5,
        administeredAtUtc: '2026-10-13T08:00:00Z',
        notes: null,
        isVoided: false,
        voidedAtUtc: null,
        voidReason: null,
        createdAtUtc: '2026-10-13T08:00:00Z'
    },
    stock: { quantityOnHand: 4.5, minimumStockLevel: 2, isBelowMinimum: false }
});

describe('AdministrationCreateDialogComponent', () => {
    let fixture: ComponentFixture<AdministrationCreateDialogComponent>;
    let cmp: AdministrationCreateDialogComponent;
    let service: jasmine.SpyObj<AdministrationsService>;
    let saved: AdministrationCreateResultVm[];

    beforeEach(async () => {
        service = jasmine.createSpyObj<AdministrationsService>('AdministrationsService', ['createAdministration']);
        service.createAdministration.and.returnValue(of(result(true)));
        await TestBed.configureTestingModule({
            imports: [AdministrationCreateDialogComponent],
            providers: [
                { provide: AdministrationsService, useValue: service },
                { provide: ProductService, useValue: { getProducts: () => of({ items: [product], page: 1, pageSize: 200, totalItems: 1, totalPages: 1 }) } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(AdministrationCreateDialogComponent);
        cmp = fixture.componentInstance;
        saved = [];
        cmp.saved.subscribe((r) => saved.push(r));
        fixture.componentRef.setInput('petId', 'p1');
        fixture.componentRef.setInput('examinationId', 'e1');
        cmp.visible.set(true);
        fixture.detectChanges();
    });

    it('ürün ve miktar olmadan gönderilmez', () => {
        cmp.onSubmit();
        expect(service.createAdministration).not.toHaveBeenCalled();
        expect(cmp.form.controls.productId.touched).toBeTrue();
    });

    it('sınır dışı miktarlar reddedilir (0, 4 ondalık, 100000 üstü)', () => {
        cmp.form.patchValue({ productId: 'pr1' });
        for (const q of [0, -1, 0.0001, 100001]) {
            cmp.form.controls.quantity.setValue(q);
            expect(cmp.form.controls.quantity.valid).withContext(String(q)).toBeFalse();
        }
        cmp.form.controls.quantity.setValue(0.5);
        expect(cmp.form.controls.quantity.valid).toBeTrue();
    });

    it('seçilen ürünün birimi miktar etiketinde gösterilir', () => {
        cmp.form.patchValue({ productId: 'pr1' });
        fixture.detectChanges();
        expect((fixture.nativeElement as HTMLElement).ownerDocument.body.textContent).toContain('(şişe)');
    });

    it('geçerli formda bağlam ve requestId ile çağırır, başarıda kapanır ve saved yayar', () => {
        cmp.form.patchValue({ productId: 'pr1', quantity: 0.5, notes: 'Damar yolu' });
        cmp.onSubmit();
        const arg = service.createAdministration.calls.mostRecent().args[0];
        expect(arg).toEqual(jasmine.objectContaining({ petId: 'p1', examinationId: 'e1', productId: 'pr1', quantity: 0.5, notes: 'Damar yolu', administeredAtUtc: null }));
        expect(arg.requestId).toBeTruthy();
        expect(cmp.visible()).toBeFalse();
        expect(saved.length).toBe(1);
    });

    it('hata sonrası yeniden denemede aynı requestId kullanılır; başarıdan sonra yenilenir', () => {
        service.createAdministration.and.returnValue(throwError(() => new Error('Stok aynı anda başka bir işlemle değişti.')));
        cmp.form.patchValue({ productId: 'pr1', quantity: 1 });
        cmp.onSubmit();
        expect(cmp.submitError()).toBe('Stok aynı anda başka bir işlemle değişti.');
        expect(cmp.visible()).toBeTrue();
        service.createAdministration.and.returnValue(of(result(true)));
        cmp.onSubmit();
        const [first, second] = service.createAdministration.calls.all().map((c) => c.args[0].requestId);
        expect(second).toBe(first);

        cmp.visible.set(true);
        fixture.detectChanges();
        cmp.form.patchValue({ productId: 'pr1', quantity: 1 });
        cmp.onSubmit();
        expect(service.createAdministration.calls.mostRecent().args[0].requestId).not.toBe(first);
    });

    it('çağrı sürerken ikinci gönderim yoksayılır', () => {
        service.createAdministration.and.returnValue(new Subject<AdministrationCreateResultVm>());
        cmp.form.patchValue({ productId: 'pr1', quantity: 1 });
        cmp.onSubmit();
        cmp.onSubmit();
        expect(service.createAdministration).toHaveBeenCalledTimes(1);
        expect(cmp.submitting()).toBeTrue();
    });
});
