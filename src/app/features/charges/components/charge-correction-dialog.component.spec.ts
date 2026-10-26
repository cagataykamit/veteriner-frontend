import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { ChargeVm } from '@/app/features/charges/models/charge-vm.model';
import { ChargesService } from '@/app/features/charges/services/charges.service';
import { ChargeCorrectionDialogComponent } from './charge-correction-dialog.component';

const charge: ChargeVm = {
    id: 'ch1',
    clientId: 'cl1',
    clientName: 'Ali Veli',
    petId: null,
    petName: null,
    visitId: null,
    examinationId: null,
    description: 'Genel muayene',
    quantity: 1,
    unitPrice: 750,
    amount: 750,
    allocatedAmount: 400,
    outstandingAmount: 350,
    currency: 'TRY',
    createdAtUtc: '2026-10-10T07:00:00Z',
    lineKind: 'Service',
    vatRate: null
};

describe('ChargeCorrectionDialogComponent', () => {
    let fixture: ComponentFixture<ChargeCorrectionDialogComponent>;
    let cmp: ChargeCorrectionDialogComponent;
    let charges: MockedObject<ChargesService>;
    let corrected: ChargeVm[];

    beforeEach(async () => {
        charges = {
            correctCharge: vi.fn().mockName('ChargesService.correctCharge')
        } as unknown as MockedObject<ChargesService>;
        await TestBed.configureTestingModule({
            imports: [ChargeCorrectionDialogComponent],
            providers: [{ provide: ChargesService, useValue: charges }]
        }).compileComponents();
        fixture = TestBed.createComponent(ChargeCorrectionDialogComponent);
        cmp = fixture.componentInstance;
        corrected = [];
        cmp.corrected.subscribe((c) => corrected.push(c));
        fixture.componentRef.setInput('charge', charge);
        cmp.visible.set(true);
        fixture.detectChanges();
    });

    it('formu mevcut ücretle doldurur; değişiklik yokken kaydedilemez', () => {
        expect(cmp.form.getRawValue()).toEqual({ description: 'Genel muayene', quantity: 1, unitPrice: 750, lineKind: 'Service', vatRate: null, reason: '' });
        cmp.form.controls.reason.setValue('Fiyat yanlış okundu');
        cmp.onSubmit();
        expect(charges.correctCharge).not.toHaveBeenCalled();
    });

    it('tahsis edilen tutar bilgisini gösterir', () => {
        expect(document.body.textContent).toContain('ödeme bağlı; yeni tutar bunun altına inemez');
    });

    it('gerekçe olmadan çağrı yapılmaz', () => {
        cmp.form.controls.unitPrice.setValue(600);
        cmp.onSubmit();
        expect(charges.correctCharge).not.toHaveBeenCalled();
    });

    it('değişiklik + gerekçeyle ücret düzeltilir, diyalog kapanır ve güncel ücret yayılır', () => {
        const updated = { ...charge, unitPrice: 600, amount: 600 };

        charges.correctCharge.mockReturnValue(of(updated));
        cmp.form.patchValue({ unitPrice: 600, reason: 'Fiyat yanlış okundu' });
        cmp.onSubmit();
        expect(charges.correctCharge).toHaveBeenCalledTimes(1);
        expect(charges.correctCharge).toHaveBeenCalledWith('ch1', { description: 'Genel muayene', quantity: 1, unitPrice: 600, reason: 'Fiyat yanlış okundu', lineKind: 'Service', vatRate: null });
        expect(cmp.visible()).toBe(false);
        expect(corrected).toEqual([updated]);
    });

    it('yalnız KDV oranı / satır türü değişikliği de düzeltme sayılır (ADR-036)', () => {
        charges.correctCharge.mockReturnValue(of({ ...charge, lineKind: 'Product', vatRate: 10 }));
        cmp.form.patchValue({ lineKind: 'Product', vatRate: 10, reason: 'Ürün satışıydı' });
        cmp.onSubmit();
        expect(charges.correctCharge).toHaveBeenCalledTimes(1);
        expect(charges.correctCharge).toHaveBeenCalledWith('ch1', expect.objectContaining({ lineKind: 'Product', vatRate: 10, unitPrice: 750 }));
    });

    it('409 tahsis altı hatası diyalogda gösterilir, diyalog açık kalır', () => {
        charges.correctCharge.mockReturnValue(throwError(() => new Error('Yeni tutar, bu ücrete bağlı ödemelerin toplamının altında olamaz.')));
        cmp.form.patchValue({ unitPrice: 300, reason: 'Fiyat yanlış okundu' });
        cmp.onSubmit();
        expect(cmp.visible()).toBe(true);
        expect(cmp.submitError()).toContain('toplamının altında');
        expect(corrected).toEqual([]);
    });

    it('geçersiz birim fiyat (0) formu geçersiz yapar', () => {
        cmp.form.patchValue({ unitPrice: 0, reason: 'Fiyat yanlış okundu' });
        expect(cmp.form.invalid).toBe(true);
    });
});
