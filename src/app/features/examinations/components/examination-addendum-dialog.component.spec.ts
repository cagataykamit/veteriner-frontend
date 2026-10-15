import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import type { ExaminationAddendumVm } from '@/app/features/examinations/models/examination-vm.model';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import { ExaminationAddendumDialogComponent } from './examination-addendum-dialog.component';

const addendum: ExaminationAddendumVm = { id: 'a1', reason: 'Hatalı kilo', text: 'Doğru kilo 12,4', createdAtUtc: null, createdByName: null };

describe('ExaminationAddendumDialogComponent', () => {
    let fixture: ComponentFixture<ExaminationAddendumDialogComponent>;
    let cmp: ExaminationAddendumDialogComponent;
    let service: jasmine.SpyObj<ExaminationsService>;
    let added: ExaminationAddendumVm[];

    beforeEach(async () => {
        service = jasmine.createSpyObj<ExaminationsService>('ExaminationsService', ['addAddendum']);
        await TestBed.configureTestingModule({
            imports: [ExaminationAddendumDialogComponent],
            providers: [{ provide: ExaminationsService, useValue: service }]
        }).compileComponents();

        fixture = TestBed.createComponent(ExaminationAddendumDialogComponent);
        cmp = fixture.componentInstance;
        fixture.componentRef.setInput('examinationId', 'e1');
        added = [];
        cmp.added.subscribe((a) => added.push(a));
        fixture.detectChanges();
        cmp.visible.set(true);
        fixture.detectChanges();
    });

    const fill = (reason: string, text: string) => cmp.form.setValue({ reason, text });

    it('gerekçe kırpılmış 5–500, metin kırpılmış 1–4000 olmalı', () => {
        fill('abcd', 'x');
        expect(cmp.form.controls.reason.invalid).toBeTrue();

        fill('     ab     ', 'x');
        expect(cmp.form.controls.reason.invalid).toBeTrue();

        fill('a'.repeat(501), 'x');
        expect(cmp.form.controls.reason.invalid).toBeTrue();

        fill('abcde', '   ');
        expect(cmp.form.controls.text.invalid).toBeTrue();

        fill('abcde', 'x'.repeat(4001));
        expect(cmp.form.controls.text.invalid).toBeTrue();

        fill('abcde', 'x'.repeat(4000));
        expect(cmp.form.valid).toBeTrue();
    });

    it('geçersiz formda istek atılmaz', () => {
        fill('abc', '');
        cmp.onSubmit();

        expect(service.addAddendum).not.toHaveBeenCalled();
    });

    it('gönderim sürerken tekrar tıklama ikinci ek not oluşturmaz (backend idempotent değil)', () => {
        const pending = new Subject<ExaminationAddendumVm>();

        service.addAddendum.and.returnValue(pending);
        fill('Hatalı kilo', 'Doğru kilo 12,4');

        cmp.onSubmit();
        cmp.onSubmit();
        cmp.onSubmit();

        expect(service.addAddendum).toHaveBeenCalledTimes(1);
        expect(cmp.submitting()).toBeTrue();
    });

    it('başarıda diyalog kapanır ve ek not bildirilir', () => {
        service.addAddendum.and.returnValue(of(addendum));
        fill('Hatalı kilo', 'Doğru kilo 12,4');

        cmp.onSubmit();

        expect(service.addAddendum).toHaveBeenCalledOnceWith('e1', { reason: 'Hatalı kilo', text: 'Doğru kilo 12,4' });
        expect(added).toEqual([addendum]);
        expect(cmp.visible()).toBeFalse();
        expect(cmp.submitting()).toBeFalse();
    });

    it('hatada mesaj gösterilir, diyalog açık kalır ve kilit açılır (tekrar denenebilir)', () => {
        service.addAddendum.and.returnValues(throwError(() => new Error('Ek not yalnızca kesinleşmiş muayeneye eklenebilir.')), of(addendum));
        fill('Hatalı kilo', 'Doğru kilo 12,4');

        cmp.onSubmit();
        expect(cmp.submitError()).toContain('yalnızca kesinleşmiş');
        expect(cmp.visible()).toBeTrue();
        expect(cmp.submitting()).toBeFalse();

        cmp.onSubmit();
        expect(service.addAddendum).toHaveBeenCalledTimes(2);
        expect(added.length).toBe(1);
    });

    it('HttpErrorResponse hatası da Türkçe mesaja çevrilir', () => {
        service.addAddendum.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: null })));
        fill('Hatalı kilo', 'Doğru kilo 12,4');

        cmp.onSubmit();

        expect(cmp.submitError()).toBe('Bu işlem için yetkiniz yok.');
    });

    it('diyalog yeniden açılınca form ve hata sıfırlanır', () => {
        fill('Hatalı kilo', 'metin');
        cmp.submitError.set('eski hata');
        cmp.visible.set(false);
        fixture.detectChanges();
        cmp.visible.set(true);
        fixture.detectChanges();

        expect(cmp.form.getRawValue()).toEqual({ reason: '', text: '' });
        expect(cmp.submitError()).toBeNull();
    });
});
