import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { ReasonConfirmDialogComponent } from './reason-confirm-dialog.component';

describe('ReasonConfirmDialogComponent', () => {
    let fixture: ComponentFixture<ReasonConfirmDialogComponent>;
    let cmp: ReasonConfirmDialogComponent;
    let execute: jasmine.Spy<(reason: string) => Observable<unknown>>;
    let confirmed: number;

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [ReasonConfirmDialogComponent] }).compileComponents();
        fixture = TestBed.createComponent(ReasonConfirmDialogComponent);
        cmp = fixture.componentInstance;
        execute = jasmine.createSpy('execute').and.returnValue(of(void 0));
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
        expect(cmp.form.controls.reason.touched).toBeTrue();
    });

    it('geçerli gerekçeyle çağrı yapar, başarıda kapanır ve confirmed yayar', () => {
        cmp.form.controls.reason.setValue('Yanlış tutar girildi');
        cmp.onSubmit();
        expect(execute).toHaveBeenCalledOnceWith('Yanlış tutar girildi');
        expect(cmp.visible()).toBeFalse();
        expect(confirmed).toBe(1);
    });

    it('hata mesajını diyalogda gösterir, kapanmaz', () => {
        execute.and.returnValue(throwError(() => new Error('Bu ödeme zaten iptal edilmiş. Listeyi yenileyin.')));
        cmp.form.controls.reason.setValue('Yanlış tutar girildi');
        cmp.onSubmit();
        expect(cmp.visible()).toBeTrue();
        expect(cmp.submitError()).toBe('Bu ödeme zaten iptal edilmiş. Listeyi yenileyin.');
        expect(confirmed).toBe(0);
    });

    it('gerekçe düzenlenince eski sunucu hatası temizlenir', () => {
        execute.and.returnValue(throwError(() => new Error('Hata.')));
        cmp.form.controls.reason.setValue('Yanlış tutar girildi');
        cmp.onSubmit();
        expect(cmp.submitError()).toBe('Hata.');
        cmp.form.controls.reason.setValue('Yanlış tutar girildi 2');
        expect(cmp.submitError()).toBeNull();
    });

    it('çağrı sürerken ikinci gönderim yoksayılır', () => {
        const pending = new Subject<void>();
        execute.and.returnValue(pending);
        cmp.form.controls.reason.setValue('Yanlış tutar girildi');
        cmp.onSubmit();
        cmp.onSubmit();
        expect(execute).toHaveBeenCalledTimes(1);
        expect(cmp.submitting()).toBeTrue();
    });

    it('yeniden açılınca gerekçe ve hata temizlenir', () => {
        execute.and.returnValue(throwError(() => new Error('Hata.')));
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
