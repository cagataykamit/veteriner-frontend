import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AdministrationCreateDialogComponent } from '@/app/features/administrations/components/administration-create-dialog.component';
import type { AdministrationCreateResultVm } from '@/app/features/administrations/models/administration-vm.model';
import { AdministrationsService } from '@/app/features/administrations/services/administrations.service';
import { AuthService } from '@/app/core/auth/auth.service';
import type { ProductStockBatchesVm, StockBatchVm } from '@/app/features/inventory/models/stock-batch-vm.model';
import { ProductService } from '@/app/features/inventory/services/product.service';
import { StockBatchService } from '@/app/features/inventory/services/stock-batch.service';

const product = { id: 'pr1', name: 'Serum', sku: 'SRM-1', categoryName: '—', unit: 'şişe', unitPriceText: '—', currency: 'TRY', isActive: true, statusLabel: 'Aktif', statusSeverity: 'success' };

const batch = (id: string, over: Partial<StockBatchVm> = {}): StockBatchVm => ({
    id,
    lotNumber: `LOT-${id}`,
    expiryDate: '2027-01-01',
    expiryText: '01.01.2027',
    expiryStatus: 'ok',
    expiryBadgeLabel: '',
    expiryBadgeSeverity: 'secondary',
    isExpired: false,
    initialQuantity: 10,
    remainingQuantity: 4,
    remainingText: '4',
    unit: 'şişe',
    supplierName: '—',
    invoiceText: '—',
    receivedText: '—',
    ...over
});

const batchInfo = (batches: StockBatchVm[], unbatchedQuantity = 0): ProductStockBatchesVm => ({
    productId: 'pr1',
    clinicId: 'c1',
    unit: 'şişe',
    quantityOnHand: 10,
    availableText: '10',
    expiredQuantity: 0,
    expiredText: '0',
    quantityOnHandText: '10',
    batchedQuantityText: '8',
    unbatchedQuantity,
    unbatchedQuantityText: String(unbatchedQuantity),
    batches
});

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
        voidStockOutcome: null,
        addedAfterFinalization: false,
        lateEntryReason: null,
        createdAtUtc: '2026-10-13T08:00:00Z',
        batchId: null,
        lotNumber: null,
        expiryDate: null,
        vaccinationId: null
    },
    stock: { quantityOnHand: 4.5, availableQuantity: 4.5, minimumStockLevel: 2, isBelowMinimum: false }
});

describe('AdministrationCreateDialogComponent', () => {
    let fixture: ComponentFixture<AdministrationCreateDialogComponent>;
    let cmp: AdministrationCreateDialogComponent;
    let service: jasmine.SpyObj<AdministrationsService>;
    let saved: AdministrationCreateResultVm[];
    let batches: jasmine.SpyObj<StockBatchService>;

    beforeEach(async () => {
        service = jasmine.createSpyObj<AdministrationsService>('AdministrationsService', ['createAdministration']);
        service.createAdministration.and.returnValue(of(result(true)));
        batches = jasmine.createSpyObj<StockBatchService>('StockBatchService', ['getByProduct']);
        batches.getByProduct.and.returnValue(of(batchInfo([batch('b1', { expiryDate: '2026-12-01' }), batch('b2', { remainingQuantity: 9, remainingText: '9' })])));
        await TestBed.configureTestingModule({
            imports: [AdministrationCreateDialogComponent],
            providers: [
                { provide: AdministrationsService, useValue: service },
                { provide: StockBatchService, useValue: batches },
                { provide: AuthService, useValue: { getClinicId: () => 'c1' } },
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

    it('sunucu hatası (ör. yetersiz stok) miktar veya ürün değişince temizlenir', () => {
        service.createAdministration.and.returnValue(throwError(() => new Error('Yetersiz stok.')));
        cmp.form.patchValue({ productId: 'pr1', quantity: 10 });
        cmp.onSubmit();
        expect(cmp.submitError()).toBe('Yetersiz stok.');
        cmp.form.controls.quantity.setValue(2);
        expect(cmp.submitError()).toBeNull();
    });

    it('ürün seçilince Miktar hatası kullanıcı yazmadan görünmez', () => {
        cmp.form.controls.productId.setValue('pr1');
        cmp.form.controls.quantity.markAsTouched();
        fixture.detectChanges();
        expect(document.body.textContent).not.toContain('0\'dan büyük');
        cmp.form.controls.quantity.setValue(0);
        cmp.form.controls.quantity.markAsDirty();
        fixture.detectChanges();
        expect(document.body.textContent).toContain('0\'dan büyük');
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

    it('taslak muayenede gerekçe alanı yok ve lateEntryReason gönderilmez', () => {
        expect((fixture.nativeElement as HTMLElement).ownerDocument.querySelector('[data-testid="late-entry-reason"]')).toBeNull();
        cmp.form.patchValue({ productId: 'pr1', quantity: 1, lateEntryReason: 'yok sayılmalı' });
        cmp.onSubmit();
        expect(service.createAdministration.calls.mostRecent().args[0].lateEntryReason).toBeNull();
    });

    it('sonradan eklemede gerekçe 5–500 karakter zorunlu; geçerliyse lateEntryReason ile gider', () => {
        fixture.componentRef.setInput('lateEntry', true);
        cmp.visible.set(false);
        fixture.detectChanges();
        cmp.visible.set(true);
        fixture.detectChanges();
        const doc = (fixture.nativeElement as HTMLElement).ownerDocument;
        expect(doc.querySelector('[data-testid="late-entry-reason"]')).not.toBeNull();
        expect(doc.body.textContent).toContain('Kesinleştirmeden sonra eklendi');

        cmp.form.patchValue({ productId: 'pr1', quantity: 1, lateEntryReason: 'abc' });
        cmp.onSubmit();
        expect(service.createAdministration).not.toHaveBeenCalled();

        cmp.form.patchValue({ lateEntryReason: '  İlaç yazılmayı unutuldu ' });
        cmp.onSubmit();
        expect(service.createAdministration.calls.mostRecent().args[0].lateEntryReason).toBe('  İlaç yazılmayı unutuldu ');
    });

    it('ürün seçilince aktif klinik için parti listesi istenir ve otomatik seçenek varsayılandır', () => {
        cmp.form.patchValue({ productId: 'pr1' });
        fixture.detectChanges();
        expect(batches.getByProduct).toHaveBeenCalledWith('pr1', 'c1');
        expect(cmp.form.controls.batchId.value).toBe('');
        expect(cmp.batchOptions().map((o) => o.value)).toEqual(['', 'b1', 'b2']);
    });

    it('otomatikte batchId gönderilmez ve SKT\'si en yakın yeterli parti önerilir', () => {
        cmp.form.patchValue({ productId: 'pr1', quantity: 2 });
        fixture.detectChanges();
        expect(cmp.batchGuide()?.text).toContain('LOT-b1');
        cmp.onSubmit();
        expect(service.createAdministration.calls.mostRecent().args[0].batchId).toBeNull();
    });

    it('miktar ilk partiyi aşınca öneri sıradaki yeterli partiye geçer', () => {
        cmp.form.patchValue({ productId: 'pr1', quantity: 6 });
        expect(cmp.batchGuide()?.text).toContain('LOT-b2');
    });

    it('seçilen parti batchId olarak gider; kalanı aşan miktar uyarılır', () => {
        cmp.form.patchValue({ productId: 'pr1', quantity: 5 });
        cmp.form.controls.batchId.setValue('b1');
        expect(cmp.batchGuide()).toEqual(jasmine.objectContaining({ warn: true }));
        cmp.form.controls.quantity.setValue(3);
        expect(cmp.batchGuide()?.warn).toBeFalse();
        expect(cmp.batchGuide()?.text).toContain('kalan 4');
        cmp.onSubmit();
        expect(service.createAdministration.calls.mostRecent().args[0].batchId).toBe('b1');
    });

    it('süresi geçmiş parti seçilemez (devre dışı)', () => {
        batches.getByProduct.and.returnValue(of(batchInfo([batch('old', { isExpired: true, expiryStatus: 'expired' }), batch('b2')])));
        cmp.form.patchValue({ productId: 'pr2' });
        const old = cmp.batchOptions().find((o) => o.value === 'old');
        expect(old?.disabled).toBeTrue();
        expect(old?.label).toContain('süresi geçmiş');
    });

    it('parti okunamazsa (yetki vb.) uygulama otomatik FEFO ile kaydedilebilir', () => {
        batches.getByProduct.and.returnValue(throwError(() => new Error('Parti bilgileri yüklenemedi.')));
        cmp.form.patchValue({ productId: 'pr1', quantity: 1 });
        fixture.detectChanges();
        expect(cmp.batchesError()).toBe('Parti bilgileri yüklenemedi.');
        cmp.onSubmit();
        expect(service.createAdministration.calls.mostRecent().args[0].batchId).toBeNull();
    });

    it('ürün değişince seçili parti sıfırlanır', () => {
        cmp.form.patchValue({ productId: 'pr1' });
        cmp.form.controls.batchId.setValue('b1');
        cmp.form.controls.productId.setValue('pr9');
        expect(cmp.form.controls.batchId.value).toBe('');
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
