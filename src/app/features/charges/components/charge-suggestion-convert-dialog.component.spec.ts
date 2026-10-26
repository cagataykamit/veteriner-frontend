import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { ChargeSuggestionVm } from '@/app/features/charges/models/charge-suggestion-vm.model';
import { ChargeSuggestionConvertDialogComponent } from './charge-suggestion-convert-dialog.component';

const suggestion = (over: Partial<ChargeSuggestionVm> = {}): ChargeSuggestionVm => ({
    id: 's1',
    sourceType: 'Administration',
    sourceId: 'a1',
    clientId: 'cl1',
    clientName: 'Ali Veli',
    petId: 'p1',
    petName: 'Pamuk',
    examinationId: null,
    visitId: null,
    description: 'Serum fizyolojik',
    quantity: 2,
    unit: 'Adet',
    suggestedUnitPrice: 125,
    currency: 'TRY',
    occurredAtUtc: '2026-10-14T07:00:00Z',
    ...over
});

describe('ChargeSuggestionConvertDialogComponent', () => {
    let fixture: ComponentFixture<ChargeSuggestionConvertDialogComponent>;
    let cmp: ChargeSuggestionConvertDialogComponent;
    let execute: Mock;
    let converted: number;

    const create = (s: ChargeSuggestionVm) => {
        fixture = TestBed.createComponent(ChargeSuggestionConvertDialogComponent);
        cmp = fixture.componentInstance;
        converted = 0;
        cmp.converted.subscribe(() => converted++);
        fixture.componentRef.setInput('suggestion', s);
        fixture.componentRef.setInput('execute', execute);
        cmp.visible.set(true);
        fixture.detectChanges();
    };

    beforeEach(async () => {
        execute = vi.fn().mockName('execute').mockReturnValue(of(null));
        await TestBed.configureTestingModule({ imports: [ChargeSuggestionConvertDialogComponent] }).compileComponents();
    });

    it('formu kalemle doldurur; değiştirmeden gönderince değişen alan yoktur', () => {
        create(suggestion());
        expect(cmp.form.getRawValue()).toEqual({ description: 'Serum fizyolojik', quantity: 2, unitPrice: 125 });
        cmp.onSubmit();
        expect(execute).toHaveBeenCalledTimes(1);
        expect(execute).toHaveBeenCalledWith({});
        expect(converted).toBe(1);
        expect(cmp.visible()).toBe(false);
    });

    it('yalnız değişen alanlar gönderilir', () => {
        create(suggestion());
        cmp.form.patchValue({ quantity: 3, unitPrice: 130 });
        cmp.onSubmit();
        expect(execute).toHaveBeenCalledTimes(1);
        expect(execute).toHaveBeenCalledWith({ quantity: 3, unitPrice: 130 });
    });

    it('fiyatı olmayan kalemde birim fiyat boş ve zorunludur', () => {
        create(suggestion({ suggestedUnitPrice: null }));
        expect(cmp.form.controls.unitPrice.value).toBeNull();
        cmp.onSubmit();
        expect(execute).not.toHaveBeenCalled();
        cmp.form.controls.unitPrice.setValue(90);
        cmp.onSubmit();
        expect(execute).toHaveBeenCalledTimes(1);
        expect(execute).toHaveBeenCalledWith({ unitPrice: 90 });
    });

    it('hata diyalogda Türkçe mesajla kalır ve kapanmaz', () => {
        create(suggestion());
        execute.mockReturnValue(throwError(() => new Error('Kalem aynı anda başka biri tarafından değiştirildi.')));
        cmp.onSubmit();
        expect(cmp.submitError()).toBe('Kalem aynı anda başka biri tarafından değiştirildi.');
        expect(cmp.visible()).toBe(true);
        expect(converted).toBe(0);
    });
});
