import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import type { ExaminationFinalizeResultVm } from '@/app/features/examinations/models/examination-vm.model';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import { ExaminationFinalizeDialogComponent } from './examination-finalize-dialog.component';

const result: ExaminationFinalizeResultVm = { id: 'e1', rowVersion: 'V2', status: 'Finalized', finalizedAtUtc: '2026-10-11T09:30:00Z' };

describe('ExaminationFinalizeDialogComponent', () => {
    let fixture: ComponentFixture<ExaminationFinalizeDialogComponent>;
    let cmp: ExaminationFinalizeDialogComponent;
    let service: jasmine.SpyObj<ExaminationsService>;
    let finalized: ExaminationFinalizeResultVm[];

    beforeEach(async () => {
        service = jasmine.createSpyObj<ExaminationsService>('ExaminationsService', ['finalizeExamination']);
        await TestBed.configureTestingModule({
            imports: [ExaminationFinalizeDialogComponent],
            providers: [{ provide: ExaminationsService, useValue: service }]
        }).compileComponents();

        fixture = TestBed.createComponent(ExaminationFinalizeDialogComponent);
        cmp = fixture.componentInstance;
        fixture.componentRef.setInput('examinationId', 'e1');
        fixture.componentRef.setInput('rowVersion', 'V1');
        finalized = [];
        cmp.finalized.subscribe((r) => finalized.push(r));
        fixture.detectChanges();
        cmp.visible.set(true);
        fixture.detectChanges();
    });

    it('onay metni kesinleştirdikten sonra tedavi, reçete, aşı ve yatış eklenemeyeceğini söyler', () => {
        const text = document.body.querySelector('[data-testid="finalize-locks-linked"]')?.textContent;

        expect(text).toContain('Kesinleştirdikten sonra tedavi, reçete, aşı ve yatış eklenemez');
    });

    it('eksik kalem uyarıları listelenir ve kesinleştirmeyi engellemez', () => {
        expect(document.body.querySelector('[data-testid="finalize-warnings"]')).toBeNull();

        fixture.componentRef.setInput('warnings', ['Değerlendirme / tanı girilmemiş.']);
        fixture.detectChanges();
        service.finalizeExamination.and.returnValue(of(result));
        cmp.onSubmit();

        expect(document.body.querySelector('[data-testid="finalize-warnings"]')?.textContent).toContain('tanı girilmemiş');
        expect(service.finalizeExamination).toHaveBeenCalledOnceWith('e1', 'V1');
    });

    it('ekranın açıldığı rowVersion ile kesinleştirir; başarıda kapanır ve sonuç bildirilir', () => {
        service.finalizeExamination.and.returnValue(of(result));

        cmp.onSubmit();

        expect(service.finalizeExamination).toHaveBeenCalledOnceWith('e1', 'V1');
        expect(finalized).toEqual([result]);
        expect(cmp.visible()).toBeFalse();
    });

    it('gönderim sürerken çift tıklama ikinci istek atmaz', () => {
        service.finalizeExamination.and.returnValue(new Subject<ExaminationFinalizeResultVm>());

        cmp.onSubmit();
        cmp.onSubmit();

        expect(service.finalizeExamination).toHaveBeenCalledTimes(1);
    });

    it('rowVersion yoksa istek atılmaz', () => {
        fixture.componentRef.setInput('rowVersion', null);
        fixture.detectChanges();

        cmp.onSubmit();

        expect(service.finalizeExamination).not.toHaveBeenCalled();
    });

    it('409 çakışmasında mesaj gösterilir, diyalog açık kalır, kilit açılır', () => {
        service.finalizeExamination.and.returnValue(
            throwError(() => new Error('Muayene siz ekranı açtıktan sonra başka biri tarafından değiştirilmiş.'))
        );

        cmp.onSubmit();

        expect(cmp.submitError()).toContain('başka biri tarafından değiştirilmiş');
        expect(cmp.visible()).toBeTrue();
        expect(cmp.submitting()).toBeFalse();
        expect(finalized.length).toBe(0);
    });
});
