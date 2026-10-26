import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { ReasonConfirmDialogComponent } from './reason-confirm-dialog.component';

describe('ReasonConfirmDialogComponent', () => {
    let fixture: ComponentFixture<ReasonConfirmDialogComponent>;
    let cmp: ReasonConfirmDialogComponent;
    let execute: Mock<(reason: string) => Observable<unknown>>;
    let confirmed: number;

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [ReasonConfirmDialogComponent] }).compileComponents();
        fixture = TestBed.createComponent(ReasonConfirmDialogComponent);
        cmp = fixture.componentInstance;
        execute = vi
            .fn()
            .mockName('execute')
            .mockReturnValue(of(void 0));
        confirmed = 0;
        fixture.componentRef.setInput('header', 'Ödemeyi iptal et');
        fixture.componentRef.setInput('execute', execute);
        cmp.confirmed.subscribe(() => confirmed++);
        cmp.visible.set(true);
        fixture.detectChanges();
    });

    it('gerekçe 5 karakterden kısaysa çağrı yapılmaz', () => {
        cmp.form.controls.reason.setValue('  ab  ');
        cmp.onSubmit();
        expect(execute).not.toHaveBeenCalled();
        expect(cmp.form.controls.reason.touched).toBe(true);
    });

    it('geçerli gerekçeyle çağrı yapar, başarıda kapanır ve confirmed yayar', () => {
        cmp.form.controls.reason.setValue('Yanlış tutar girildi');
        cmp.onSubmit();
        expect(execute).toHaveBeenCalledTimes(1);
        expect(execute).toHaveBeenCalledWith('Yanlış tutar girildi');
        expect(cmp.visible()).toBe(false);
        expect(confirmed).toBe(1);
    });

    it('hata mesajını diyalogda gösterir, kapanmaz', () => {
        execute.mockReturnValue(throwError(() => new Error('Bu ödeme zaten iptal edilmiş. Listeyi yenileyin.')));
        cmp.form.controls.reason.setValue('Yanlış tutar girildi');
        cmp.onSubmit();
        expect(cmp.visible()).toBe(true);
        expect(cmp.submitError()).toBe('Bu ödeme zaten iptal edilmiş. Listeyi yenileyin.');
        expect(confirmed).toBe(0);
    });

    it('gerekçe düzenlenince eski sunucu hatası temizlenir', () => {
        execute.mockReturnValue(throwError(() => new Error('Hata.')));
        cmp.form.controls.reason.setValue('Yanlış tutar girildi');
        cmp.onSubmit();
        expect(cmp.submitError()).toBe('Hata.');
        cmp.form.controls.reason.setValue('Yanlış tutar girildi 2');
        expect(cmp.submitError()).toBeNull();
    });

    it('çağrı sürerken ikinci gönderim yoksayılır', () => {
        const pending = new Subject<void>();

        execute.mockReturnValue(pending);
        cmp.form.controls.reason.setValue('Yanlış tutar girildi');
        cmp.onSubmit();
        cmp.onSubmit();
        expect(execute).toHaveBeenCalledTimes(1);
        expect(cmp.submitting()).toBe(true);
    });

    it('gerekçe opsiyonelse boş gerekçeyle çağrı yapılır; 500 karakteri aşan gerekçe reddedilir', () => {
        cmp.visible.set(false);
        fixture.componentRef.setInput('reasonOptional', true);
        fixture.detectChanges();
        cmp.visible.set(true);
        fixture.detectChanges();

        expect(document.body.textContent).toContain('Gerekçe (opsiyonel)');

        cmp.form.controls.reason.setValue('x'.repeat(501));
        cmp.onSubmit();
        expect(execute).not.toHaveBeenCalled();

        cmp.form.controls.reason.setValue('');
        cmp.onSubmit();
        expect(execute).toHaveBeenCalledTimes(1);
        expect(execute).toHaveBeenCalledWith('');
        expect(confirmed).toBe(1);
    });

    it('yeniden açılınca gerekçe ve hata temizlenir', () => {
        execute.mockReturnValue(throwError(() => new Error('Hata.')));
        cmp.form.controls.reason.setValue('Yanlış tutar girildi');
        cmp.onSubmit();
        cmp.visible.set(false);
        fixture.detectChanges();
        cmp.visible.set(true);
        fixture.detectChanges();
        expect(cmp.submitError()).toBeNull();
        expect(cmp.form.controls.reason.value).toBe('');
    });
});
