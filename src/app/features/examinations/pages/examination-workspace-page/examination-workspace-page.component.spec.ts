import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { AppointmentsService } from '@/app/features/appointments/services/appointments.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import type { ExaminationEditVm } from '@/app/features/examinations/models/examination-vm.model';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import { EXAMINATION_CONCURRENCY_CONFLICT_MESSAGE } from '@/app/features/examinations/utils/examination-upsert-validation-parse.utils';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { ExaminationWorkspacePageComponent } from './examination-workspace-page.component';

const editVm = (over: Partial<ExaminationEditVm> = {}): ExaminationEditVm => ({
    id: 'e1',
    clinicId: 'clinic-1',
    clientId: 'client-1',
    petId: 'pet-1',
    clientName: 'Ali Veli',
    petName: 'Pamuk',
    appointmentId: 'appt-1',
    examinedAtUtc: '2026-10-08T10:30:00Z',
    visitReason: 'İştahsızlık',
    anamnesis: '',
    findings: '',
    weightKg: null,
    temperatureC: null,
    heartRateBpm: null,
    respiratoryRatePerMin: null,
    vitalsMeasuredAtUtc: null,
    assessment: '',
    plan: '',
    notes: '',
    rowVersion: 'V1',
    ...over
});

const httpError = (status: number, code?: string) =>
    new HttpErrorResponse({ status, error: code ? { status, extensions: { code } } : null });

describe('ExaminationWorkspacePageComponent (düzenleme)', () => {
    let fixture: ComponentFixture<ExaminationWorkspacePageComponent>;
    let cmp: ExaminationWorkspacePageComponent;
    let service: jasmine.SpyObj<ExaminationsService>;
    let toastAdd: jasmine.Spy;

    beforeEach(async () => {
        service = jasmine.createSpyObj<ExaminationsService>('ExaminationsService', [
            'getExaminationForEditById',
            'updateExamination',
            'createExamination'
        ]);
        service.getExaminationForEditById.and.returnValue(of(editVm()));

        await TestBed.configureTestingModule({
            imports: [ExaminationWorkspacePageComponent],
            providers: [
                provideRouter([]),
                { provide: ExaminationsService, useValue: service },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            paramMap: convertToParamMap({ id: 'e1' }),
                            queryParamMap: convertToParamMap({}),
                            routeConfig: { path: ':id/edit' }
                        }
                    }
                },
                {
                    provide: AuthService,
                    useValue: {
                        getClinicName: () => 'Klinik',
                        getClinicId: () => 'clinic-1',
                        hasOperationClaim: () => true
                    }
                },
                { provide: AppointmentsService, useValue: {} },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                { provide: PetsService, useValue: { getPetById: () => of({ name: 'Pamuk', speciesName: 'Kedi', breed: 'Van', birthDate: null }) } },
                { provide: ClientsService, useValue: { getClientById: () => of({ fullName: 'Ali Veli', phone: '555', email: '—' }) } }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ExaminationWorkspacePageComponent);
        cmp = fixture.componentInstance;
        toastAdd = spyOn(fixture.debugElement.injector.get(MessageService), 'add');
        fixture.detectChanges();
    });

    const typeNote = (text: string) => {
        cmp.form.controls.anamnesis.setValue(text);
        cmp.form.controls.plan.setValue('Sıvı tedavisi');
        cmp.form.controls.visitReason.setValue('İştahsızlık — güncellendi');
    };

    it('kayıt sürümüyle yüklenir ve PUT a rowVersion ile mevcut appointmentId gönderilir', () => {
        service.updateExamination.and.returnValue(of({ id: 'e1', rowVersion: 'V2' }));
        typeNote('3 gündür az yiyor');
        cmp.onSubmit();

        expect(service.updateExamination).toHaveBeenCalledTimes(1);
        const [id, payload] = service.updateExamination.calls.mostRecent().args;
        expect(id).toBe('e1');
        expect(payload.rowVersion).toBe('V1');
        expect(payload.appointmentId).toBe('appt-1');
        expect(payload.clinicId).toBe('clinic-1');
        expect(payload.petId).toBe('pet-1');
        expect(payload.anamnesis).toBe('3 gündür az yiyor');
    });

    it('başarılı kayıtta dönen yeni rowVersion sonraki PUT a taşınır', () => {
        service.updateExamination.and.returnValue(of({ id: 'e1', rowVersion: 'V2' }));
        typeNote('a');
        cmp.onSubmit();
        cmp.form.controls.plan.setValue('ikinci kayıt');
        cmp.onSubmit();

        expect(service.updateExamination.calls.count()).toBe(2);
        expect(service.updateExamination.calls.argsFor(1)[1].rowVersion).toBe('V2');
        expect(toastAdd).toHaveBeenCalledTimes(2);
    });

    it('409 çakışmasında yazılan metin korunur, uyarı gösterilir, rowVersion sessizce yenilenmez', () => {
        service.updateExamination.and.returnValue(throwError(() => httpError(409, 'Examinations.ConcurrencyConflict')));
        typeNote('B nin yazdığı anamnez');
        cmp.onSubmit();

        expect(cmp.conflict()).toBeTrue();
        expect(cmp.submitError()).toBe(EXAMINATION_CONCURRENCY_CONFLICT_MESSAGE);
        expect(cmp.form.controls.anamnesis.value).toBe('B nin yazdığı anamnez');
        expect(cmp.form.controls.plan.value).toBe('Sıvı tedavisi');
        expect(cmp.form.controls.visitReason.value).toBe('İştahsızlık — güncellendi');
        // Otomatik yeniden kayıt veya yeniden yükleme yok.
        expect(service.updateExamination).toHaveBeenCalledTimes(1);
        expect(service.getExaminationForEditById).toHaveBeenCalledTimes(1);
        expect(cmp.current!.rowVersion).toBe('V1');

        fixture.detectChanges();
        const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('a[target="_blank"]');
        expect(link).not.toBeNull();
        expect(link!.getAttribute('href')).toContain('/panel/examinations/e1');
    });

    it('çakışmadan sonra yeniden denemek yine eski rowVersion ı gönderir', () => {
        service.updateExamination.and.returnValue(throwError(() => httpError(409, 'Examinations.ConcurrencyConflict')));
        typeNote('x');
        cmp.onSubmit();
        cmp.onSubmit();
        expect(service.updateExamination.calls.argsFor(1)[1].rowVersion).toBe('V1');
    });

    it('doğrulama hatasında (400) metin korunur ve alan hatası gösterilir; çakışma değildir', () => {
        service.updateExamination.and.returnValue(
            throwError(
                () =>
                    new HttpErrorResponse({
                        status: 400,
                        error: { extensions: { code: 'Examinations.Validation' }, errors: { Plan: ['Çok uzun'] } }
                    })
            )
        );
        typeNote('korunmalı');
        cmp.onSubmit();

        expect(cmp.conflict()).toBeFalse();
        expect(cmp.apiFieldErrors().plan).toBe('Çok uzun');
        expect(cmp.form.controls.anamnesis.value).toBe('korunmalı');
    });

    it('ağ hatasında (status 0) metin korunur', () => {
        service.updateExamination.and.returnValue(throwError(() => httpError(0)));
        typeNote('ağ koptu');
        cmp.onSubmit();

        expect(cmp.submitError()).toBeTruthy();
        expect(cmp.conflict()).toBeFalse();
        expect(cmp.form.controls.anamnesis.value).toBe('ağ koptu');
        expect(cmp.form.controls.visitReason.value).toBe('İştahsızlık — güncellendi');
    });

    it('boşaltılan metin alanı PUT ta "" olarak gider', () => {
        service.getExaminationForEditById.and.returnValue(of(editVm({ plan: 'eski plan', notes: 'eski not' })));
        cmp.reload();
        service.updateExamination.and.returnValue(of({ id: 'e1', rowVersion: 'V2' }));
        cmp.form.controls.plan.setValue('');
        cmp.onSubmit();

        const payload = service.updateExamination.calls.mostRecent().args[1];
        expect(payload.plan).toBe('');
        expect(payload.notes).toBe('eski not');
    });

    it('kayıttaki tüm vitaller boşaltılırsa clearVitals:true gider; sonraki kayıtta yinelenmez', () => {
        service.getExaminationForEditById.and.returnValue(of(editVm({ weightKg: 4.25, temperatureC: 38.6 })));
        cmp.reload();
        service.updateExamination.and.returnValue(of({ id: 'e1', rowVersion: 'V2' }));
        cmp.form.patchValue({ weightKg: null, temperatureC: null });
        cmp.onSubmit();

        const first = service.updateExamination.calls.argsFor(0)[1];
        expect(first.clearVitals).toBeTrue();
        expect(first.weightKg).toBeNull();

        cmp.form.controls.plan.setValue('sonraki');
        cmp.onSubmit();
        expect(service.updateExamination.calls.argsFor(1)[1].clearVitals).toBeFalse();
    });

    it('tek vitali silmek (diğeri kalırken) engellenir ve kayıt gönderilmez', () => {
        service.getExaminationForEditById.and.returnValue(of(editVm({ weightKg: 4.25, temperatureC: 38.6 })));
        cmp.reload();
        cmp.form.controls.weightKg.setValue(null);

        expect(cmp.form.hasError('partialVitalClear')).toBeTrue();
        expect(cmp.saveDisabled()).toBeTrue();
        cmp.onSubmit();
        expect(service.updateExamination).not.toHaveBeenCalled();
    });

    it('vital değer varken PUT ta clearVitals gönderilmez', () => {
        service.getExaminationForEditById.and.returnValue(of(editVm({ weightKg: 4.25 })));
        cmp.reload();
        service.updateExamination.and.returnValue(of({ id: 'e1', rowVersion: 'V2' }));
        cmp.form.controls.weightKg.setValue(5);
        cmp.onSubmit();

        const payload = service.updateExamination.calls.mostRecent().args[1];
        expect(payload.clearVitals).toBeFalse();
        expect(payload.weightKg).toBe(5);
    });

    it('başarılı güncellemede aynı ekranda kalınır, başarı toast ı gösterilir, form temiz ve sürüm güncel olur', () => {
        const navigate = spyOn(TestBed.inject(Router), 'navigate');
        service.updateExamination.and.returnValue(of({ id: 'e1', rowVersion: 'V2' }));
        typeNote('yeni anamnez');
        cmp.form.markAsDirty();
        expect(cmp.saveDisabled()).toBeFalse();
        cmp.onSubmit();

        expect(toastAdd).toHaveBeenCalledOnceWith(jasmine.objectContaining({ severity: 'success', detail: 'Muayene kaydedildi.' }));
        expect(navigate).not.toHaveBeenCalled();
        expect(cmp.form.pristine).toBeTrue();
        expect(cmp.current!.rowVersion).toBe('V2');
        expect(cmp.form.controls.anamnesis.value).toBe('yeni anamnez');
        // Değişiklik yokken tekrar kaydetmek kapalıdır (çift kayıt önlemi).
        expect(cmp.saveDisabled()).toBeTrue();
    });

    it('kayıt sürerken ikinci gönderim yoksayılır', () => {
        const inFlight = new Subject<{ id: string; rowVersion: string }>();
        service.updateExamination.and.returnValue(inFlight);
        typeNote('x');
        cmp.onSubmit();
        cmp.onSubmit();

        expect(service.updateExamination).toHaveBeenCalledTimes(1);
        inFlight.next({ id: 'e1', rowVersion: 'V2' });
        inFlight.complete();
        expect(toastAdd).toHaveBeenCalledTimes(1);
    });

    for (const [name, err] of [
        ['400', new HttpErrorResponse({ status: 400, error: { extensions: { code: 'Examinations.Validation' }, detail: 'Geçersiz istek' } })],
        ['409', httpError(409, 'Examinations.ConcurrencyConflict')],
        ['ağ', httpError(0)]
    ] as const) {
        it(`${name} hatasında başarı toast ı çıkmaz, açık mesaj gösterilir, form kirli ve metin korunur`, () => {
            service.updateExamination.and.returnValue(throwError(() => err));
            typeNote('korunmalı');
            cmp.form.markAsDirty();
            cmp.onSubmit();

            expect(toastAdd).not.toHaveBeenCalled();
            expect(cmp.submitError()).toBeTruthy();
            expect(cmp.form.dirty).toBeTrue();
            expect(cmp.form.controls.anamnesis.value).toBe('korunmalı');
            expect(cmp.saveDisabled()).toBeFalse();
        });
    }

    it('oluşturma sonrası ?saved=1 ile açılan çalışma alanı başarı toast ı gösterir ve işareti URL den kaldırır', () => {
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        const route = TestBed.inject(ActivatedRoute) as unknown as { snapshot: { queryParamMap: unknown } };
        route.snapshot.queryParamMap = convertToParamMap({ saved: '1' });
        const f2 = TestBed.createComponent(ExaminationWorkspacePageComponent);
        const add2 = spyOn(f2.debugElement.injector.get(MessageService), 'add');
        f2.detectChanges();

        expect(add2).toHaveBeenCalledOnceWith(jasmine.objectContaining({ severity: 'success', detail: 'Muayene kaydedildi.' }));
        expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { saved: null }, replaceUrl: true }));
    });

    it('findings boş olsa da form geçerlidir; tek zorunlu klinik alan visitReason dır', () => {
        expect(cmp.form.valid).toBeTrue();
        cmp.form.controls.visitReason.setValue('   ');
        expect(cmp.form.controls.visitReason.valid).toBeFalse();
    });

    it('vital değer 0 veya negatifse geçersiz, boşsa geçerlidir', () => {
        cmp.form.controls.weightKg.setValue(0);
        expect(cmp.form.controls.weightKg.valid).toBeFalse();
        cmp.form.controls.weightKg.setValue(null);
        expect(cmp.form.controls.weightKg.valid).toBeTrue();
        cmp.form.controls.heartRateBpm.setValue(80.5);
        expect(cmp.form.controls.heartRateBpm.valid).toBeFalse();
    });
});
