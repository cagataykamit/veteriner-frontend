import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { throwError } from 'rxjs';
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
