import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import { QuickClientDialogComponent } from './quick-client-dialog.component';

describe('QuickClientDialogComponent — aramadan önden doldurma (APPT-017/019)', () => {
    const create = (initialText: string) => {
        TestBed.configureTestingModule({
            imports: [QuickClientDialogComponent],
            providers: [{ provide: ClientsService, useValue: { createClient: vi.fn() } }]
        });
        const fixture = TestBed.createComponent(QuickClientDialogComponent);

        fixture.componentRef.setInput('initialText', initialText);
        fixture.componentInstance.onShow();

        return fixture.componentInstance;
    };

    it('ad gibi aranan metin ad soyada yazılır', () => {
        const cmp = create('Ayşe Yılmaz');

        expect(cmp.form.controls.fullName.value).toBe('Ayşe Yılmaz');
        expect(cmp.form.controls.phone.value).toBe('');
    });

    it('telefon gibi aranan metin telefona yazılır', () => {
        const cmp = create('0532 111 22 33');

        expect(cmp.form.controls.fullName.value).toBe('');
        expect(cmp.form.controls.phone.value).toBe('0532 111 22 33');
    });
});

describe('QuickClientDialogComponent — deneme müşteri kotası (TRIAL-006)', () => {
    it('422 Trial.ClientQuotaExceeded sunucu metni deneme uyarısına gider; diyalog açık kalır, genel hata yok', () => {
        const detail = 'Deneme sürümünde en fazla 1000 müşteri kaydı sınırı doldu; abonelikle kalkar.';
        const createClient = vi.fn().mockReturnValue(throwError(() => new HttpErrorResponse({ status: 422, error: { status: 422, detail, code: 'Trial.ClientQuotaExceeded' } })));

        TestBed.configureTestingModule({
            imports: [QuickClientDialogComponent],
            providers: [{ provide: ClientsService, useValue: { createClient } }]
        });
        const cmp = TestBed.createComponent(QuickClientDialogComponent).componentInstance;

        cmp.visible.set(true);
        cmp.onShow();
        cmp.form.patchValue({ fullName: 'Ayşe Yılmaz', phone: '0532 111 22 33' });
        cmp.onSubmit();

        expect(createClient).toHaveBeenCalledTimes(1);
        expect(cmp.trialLimitError()).toBe(detail);
        expect(cmp.submitError()).toBeNull();
        expect(cmp.visible()).toBe(true);
    });
});

@Component({
    standalone: true,
    imports: [ReactiveFormsModule, QuickClientDialogComponent],
    template: `<form [formGroup]="outer" (ngSubmit)="outerSubmitted = true"><app-quick-client-dialog [(visible)]="open" /></form>`
})
class OuterFormHostComponent {
    readonly outer = new FormGroup({});
    open = true;
    outerSubmitted = false;
}

describe('QuickClientDialogComponent — Enter ile kaydetme', () => {
    it('Enter (varsayılan düğmeyle form gönderimi) müşteriyi kaydeder; sayfadaki dış form gönderilmez', async () => {
        const createClient = vi.fn().mockReturnValue(of({ id: 'c1' }));

        TestBed.configureTestingModule({
            imports: [OuterFormHostComponent],
            providers: [{ provide: ClientsService, useValue: { createClient } }]
        });
        const fixture = TestBed.createComponent(OuterFormHostComponent);

        fixture.detectChanges();
        await fixture.whenStable();
        const dialog = fixture.debugElement.query(By.directive(QuickClientDialogComponent)).componentInstance as QuickClientDialogComponent;

        dialog.form.patchValue({ fullName: 'Ayşe Yılmaz', phone: '0532 111 22 33' });
        fixture.detectChanges();
        const form = document.getElementById('quick-client-form') as HTMLFormElement;

        form.requestSubmit();

        expect(createClient).toHaveBeenCalledTimes(1);
        expect(fixture.componentInstance.outerSubmitted).toBe(false);
    });
});
