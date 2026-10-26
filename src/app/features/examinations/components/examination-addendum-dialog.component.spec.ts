import type { MockedObject } from 'vitest';
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
    let service: MockedObject<ExaminationsService>;
    let added: ExaminationAddendumVm[];

    beforeEach(async () => {
        service = {
            addAddendum: vi.fn().mockName('ExaminationsService.addAddendum')
        } as unknown as MockedObject<ExaminationsService>;
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
        expect(cmp.form.controls.reason.invalid).toBe(true);

        fill('     ab     ', 'x');
        expect(cmp.form.controls.reason.invalid).toBe(true);

        fill('a'.repeat(501), 'x');
        expect(cmp.form.controls.reason.invalid).toBe(true);

        fill('abcde', '   ');
        expect(cmp.form.controls.text.invalid).toBe(true);

        fill('abcde', 'x'.repeat(4001));
        expect(cmp.form.controls.text.invalid).toBe(true);

        fill('abcde', 'x'.repeat(4000));
        expect(cmp.form.valid).toBe(true);
    });

    it('geçersiz formda istek atılmaz', () => {
        fill('abc', '');
        cmp.onSubmit();

        expect(service.addAddendum).not.toHaveBeenCalled();
    });

    it('gönderim sürerken tekrar tıklama ikinci ek not oluşturmaz (backend idempotent değil)', () => {
        const pending = new Subject<ExaminationAddendumVm>();

        service.addAddendum.mockReturnValue(pending);
        fill('Hatalı kilo', 'Doğru kilo 12,4');

        cmp.onSubmit();
        cmp.onSubmit();
        cmp.onSubmit();

        expect(service.addAddendum).toHaveBeenCalledTimes(1);
        expect(cmp.submitting()).toBe(true);
    });

    it('başarıda diyalog kapanır ve ek not bildirilir', () => {
        service.addAddendum.mockReturnValue(of(addendum));
        fill('Hatalı kilo', 'Doğru kilo 12,4');

        cmp.onSubmit();

        expect(service.addAddendum).toHaveBeenCalledTimes(1);

        expect(service.addAddendum).toHaveBeenCalledWith('e1', { reason: 'Hatalı kilo', text: 'Doğru kilo 12,4' });
        expect(added).toEqual([addendum]);
        expect(cmp.visible()).toBe(false);
        expect(cmp.submitting()).toBe(false);
    });

    it('hatada mesaj gösterilir, diyalog açık kalır ve kilit açılır (tekrar denenebilir)', () => {
        service.addAddendum.mockReturnValueOnce(throwError(() => new Error('Ek not yalnızca kesinleşmiş muayeneye eklenebilir.'))).mockReturnValueOnce(of(addendum));
        fill('Hatalı kilo', 'Doğru kilo 12,4');

        cmp.onSubmit();
        expect(cmp.submitError()).toContain('yalnızca kesinleşmiş');
        expect(cmp.visible()).toBe(true);
        expect(cmp.submitting()).toBe(false);

        cmp.onSubmit();
        expect(service.addAddendum).toHaveBeenCalledTimes(2);
        expect(added.length).toBe(1);
    });

    it('HttpErrorResponse hatası da Türkçe mesaja çevrilir', () => {
        service.addAddendum.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403, error: null })));
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
