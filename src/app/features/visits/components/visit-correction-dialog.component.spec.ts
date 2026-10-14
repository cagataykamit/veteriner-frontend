import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import type { TodayItemVm, VisitVm } from '@/app/features/visits/models/visit-vm.model';
import { VisitsService } from '@/app/features/visits/services/visits.service';
import { VisitCorrectionDialogComponent } from './visit-correction-dialog.component';

const item: TodayItemVm = {
    key: 'v1',
    visitId: 'v1',
    appointmentId: null,
    petId: 'p1',
    petName: 'Pamuk',
    speciesName: 'Kedi',
    clientId: 'cl1',
    clientName: 'Ali Veli',
    clientPhone: null,
    scheduledAtUtc: null,
    arrivedAtUtc: '2026-10-10T07:00:00Z',
    careStatus: 'Completed',
    appointmentStatus: null,
    responsibleVeterinarianName: null,
    isCarriedOver: false,
    chargedAmount: null,
    allocatedAmount: null,
    outstandingAmount: null,
    clientOutstandingAmount: null,
    chargeIndicator: null,
    chargeableWorkCount: null,
    awaitingLabCount: null,
    hasActiveHospitalization: false,
    isVoided: false,
    voidReason: null,
    petAlerts: { flags: [], note: null },
    isUrgent: false
};

const visit: VisitVm = {
    id: 'v1',
    clinicId: 'c1',
    petId: 'p1',
    appointmentId: null,
    responsibleVeterinarianUserId: null,
    responsibleVeterinarianName: null,
    arrivedAtUtc: item.arrivedAtUtc!,
    careStatus: 'InProgress',
    isVoided: false,
    isUrgent: false
};

describe('VisitCorrectionDialogComponent', () => {
    let fixture: ComponentFixture<VisitCorrectionDialogComponent>;
    let cmp: VisitCorrectionDialogComponent;
    let visits: jasmine.SpyObj<VisitsService>;
    let corrected: VisitVm[];

    beforeEach(async () => {
        visits = jasmine.createSpyObj<VisitsService>('VisitsService', ['correctVisit']);
        await TestBed.configureTestingModule({
            imports: [VisitCorrectionDialogComponent],
            providers: [{ provide: VisitsService, useValue: visits }]
        }).compileComponents();

        fixture = TestBed.createComponent(VisitCorrectionDialogComponent);
        cmp = fixture.componentInstance;
        fixture.componentRef.setInput('item', item);
        corrected = [];
        cmp.corrected.subscribe((v) => corrected.push(v));
        fixture.detectChanges();
        cmp.visible.set(true);
        fixture.detectChanges();
    });

    it('seçenekler mevcut durum hariç: Bekliyor, Devam ediyor, Yanlış geliş', () => {
        expect(cmp.actionOptions().map((o) => o.value)).toEqual(['Waiting', 'InProgress', 'Mistaken']);
    });

    /** Karma sayfasının betik metinlerini dışarıda bırakmak için yalnız diyalog içeriği okunur. */
    const dialogText = (): string => Array.from(document.querySelectorAll('.p-dialog')).map((d) => d.textContent ?? '').join(' ');

    it('etiket "Yapılacak düzeltme *"', () => {
        const label = document.querySelector('label[for="vc-action"]');
        expect(label?.textContent?.trim()).toBe('Yapılacak düzeltme *');
    });

    it('"Yanlış geliş olarak işaretle" seçilince açıklama gösterilir; diğer seçeneklerde gösterilmez', () => {
        const note = 'Kaydı Bugün listesinden kaldırır; Yanlış işaretlenenler sekmesinden geri alınabilir.';
        expect(dialogText()).not.toContain(note);
        cmp.form.controls.action.setValue('Mistaken');
        fixture.detectChanges();
        expect(dialogText()).toContain(note);
        cmp.form.controls.action.setValue('Waiting');
        fixture.detectChanges();
        expect(dialogText()).not.toContain(note);
    });

    it('Bekliyor durumundan "Tamamlandı" seçilince "Bu geliş için muayene açılmadı." bilgi notu çıkar', () => {
        fixture.componentRef.setInput('item', { ...item, careStatus: 'Waiting' });
        fixture.detectChanges();
        expect(dialogText()).not.toContain('Bu geliş için muayene açılmadı.');
        cmp.form.controls.action.setValue('Completed');
        fixture.detectChanges();
        expect(dialogText()).toContain('Bu geliş için muayene açılmadı.');
        cmp.form.controls.action.setValue('InProgress');
        fixture.detectChanges();
        expect(dialogText()).not.toContain('Bu geliş için muayene açılmadı.');
    });

    it('Devam ediyor durumundan "Tamamlandı" seçilince muayene notu çıkmaz', () => {
        fixture.componentRef.setInput('item', { ...item, careStatus: 'InProgress' });
        fixture.detectChanges();
        cmp.form.controls.action.setValue('Completed');
        fixture.detectChanges();
        expect(dialogText()).not.toContain('Bu geliş için muayene açılmadı.');
    });

    it('gerekçe olmadan veya 5 karakterden kısa gerekçeyle gönderilmez', () => {
        cmp.form.controls.action.setValue('Waiting');
        cmp.form.controls.reason.setValue('  ab  ');
        cmp.onSubmit();
        expect(visits.correctVisit).not.toHaveBeenCalled();
        expect(cmp.form.controls.reason.touched).toBeTrue();
    });

    it('geçerli düzeltme gerekçeyle gönderilir, diyalog kapanır ve satır güncellenmek üzere bildirilir', () => {
        visits.correctVisit.and.returnValue(of(visit));
        cmp.form.controls.action.setValue('InProgress');
        cmp.form.controls.reason.setValue('Yanlış tamamlandı');
        cmp.onSubmit();

        expect(visits.correctVisit).toHaveBeenCalledOnceWith('v1', { action: 'InProgress', reason: 'Yanlış tamamlandı' });
        expect(corrected).toEqual([visit]);
        expect(cmp.visible()).toBeFalse();
    });

    it('çift tıklama ikinci istek üretmez', () => {
        const pending = new Subject<VisitVm>();
        visits.correctVisit.and.returnValue(pending);
        cmp.form.controls.action.setValue('Mistaken');
        cmp.form.controls.reason.setValue('Başka hasta kaydedildi');
        cmp.onSubmit();
        cmp.onSubmit();
        expect(visits.correctVisit).toHaveBeenCalledTimes(1);
    });

    it('hata mesajı gösterilir ve diyalog açık kalır', () => {
        visits.correctVisit.and.returnValue(throwError(() => new Error('Muayenesi olan geliş yanlış geliş olarak işaretlenemez.')));
        cmp.form.controls.action.setValue('Mistaken');
        cmp.form.controls.reason.setValue('Başka hasta kaydedildi');
        cmp.onSubmit();

        expect(cmp.submitError()).toBe('Muayenesi olan geliş yanlış geliş olarak işaretlenemez.');
        expect(cmp.visible()).toBeTrue();
        expect(cmp.submitting()).toBeFalse();
    });
});

describe('VisitCorrectionDialogComponent — restore modu', () => {
    let fixture: ComponentFixture<VisitCorrectionDialogComponent>;
    let cmp: VisitCorrectionDialogComponent;
    let visits: jasmine.SpyObj<VisitsService>;

    beforeEach(async () => {
        visits = jasmine.createSpyObj<VisitsService>('VisitsService', ['correctVisit', 'restoreVisit']);
        await TestBed.configureTestingModule({
            imports: [VisitCorrectionDialogComponent],
            providers: [{ provide: VisitsService, useValue: visits }]
        }).compileComponents();
        fixture = TestBed.createComponent(VisitCorrectionDialogComponent);
        cmp = fixture.componentInstance;
        fixture.componentRef.setInput('item', { ...item, isVoided: true, voidReason: 'Yanlış' });
        fixture.componentRef.setInput('mode', 'restore');
        fixture.detectChanges();
        cmp.visible.set(true);
        fixture.detectChanges();
    });

    it('durum seçimi gerekmez; kısa gerekçe gönderilmez', () => {
        cmp.form.controls.reason.setValue('abc');
        cmp.onSubmit();
        expect(visits.restoreVisit).not.toHaveBeenCalled();
    });

    it('geçerli gerekçeyle restoreVisit çağrılır, correctVisit çağrılmaz', () => {
        visits.restoreVisit.and.returnValue(of(visit));
        cmp.form.controls.reason.setValue('Yanlışlıkla işaretlendi');
        cmp.onSubmit();
        expect(visits.restoreVisit).toHaveBeenCalledOnceWith('v1', 'Yanlışlıkla işaretlendi');
        expect(visits.correctVisit).not.toHaveBeenCalled();
        expect(cmp.visible()).toBeFalse();
    });

    it('409 mesajı gösterilir, diyalog açık kalır', () => {
        visits.restoreVisit.and.returnValue(throwError(() => new Error('Bu hayvanın başka açık geliş kaydı var.')));
        cmp.form.controls.reason.setValue('Yanlışlıkla işaretlendi');
        cmp.onSubmit();
        expect(cmp.submitError()).toBe('Bu hayvanın başka açık geliş kaydı var.');
        expect(cmp.visible()).toBeTrue();
    });
});
