import type { Mock, MockedObject } from 'vitest';
import { HttpErrorResponse, provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { EMPTY, of, Subject, throwError } from 'rxjs';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import { AppointmentsService } from '@/app/features/appointments/services/appointments.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import type { ExaminationEditVm } from '@/app/features/examinations/models/examination-vm.model';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import { EXAMINATION_CONCURRENCY_CONFLICT_MESSAGE } from '@/app/features/examinations/utils/examination-upsert-validation-parse.utils';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { DetailRelatedSummariesService } from '@/app/features/patients/services/detail-related-summaries.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
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
    status: 'Draft',
    rowVersion: 'V1',
    ...over
});

const httpError = (status: number, code?: string) => new HttpErrorResponse({ status, error: code ? { status, extensions: { code } } : null });

describe('ExaminationWorkspacePageComponent (düzenleme)', () => {
    let fixture: ComponentFixture<ExaminationWorkspacePageComponent>;
    let cmp: ExaminationWorkspacePageComponent;
    let service: MockedObject<ExaminationsService>;
    let navigate: Mock;

    beforeEach(async () => {
        service = {
            getExaminationForEditById: vi.fn().mockName('ExaminationsService.getExaminationForEditById'),
            updateExamination: vi.fn().mockName('ExaminationsService.updateExamination'),
            createExamination: vi.fn().mockName('ExaminationsService.createExamination')
        } as unknown as MockedObject<ExaminationsService>;
        service.getExaminationForEditById.mockReturnValue(of(editVm()));

        await TestBed.configureTestingModule({
            imports: [ExaminationWorkspacePageComponent],
            providers: [
                provideRouter([]),
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
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
                { provide: PetsService, useValue: { getPetById: () => of({ name: 'Pamuk', speciesName: 'Kedi', breed: 'Van', birthDate: null }), getPetSummary: () => EMPTY } },
                { provide: DetailRelatedSummariesService, useValue: { loadSiblingExaminationsForPet: () => of([]) } },
                { provide: ClientsService, useValue: { getClientById: () => of({ fullName: 'Ali Veli', phone: '555', email: '—' }) } }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ExaminationWorkspacePageComponent);
        cmp = fixture.componentInstance;
        navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        fixture.detectChanges();
    });

    const typeNote = (text: string) => {
        cmp.form.controls.anamnesis.setValue(text);
        cmp.form.controls.plan.setValue('Sıvı tedavisi');
        cmp.form.controls.visitReason.setValue('İştahsızlık — güncellendi');
    };

    it('düzenlemede hasta bağlamı paneli formun yanında açık muayenenin hayvanıyla çizilir', () => {
        fixture.detectChanges();
        const panel = (fixture.nativeElement as HTMLElement).querySelector('app-examination-patient-context');

        expect(panel).not.toBeNull();
        expect(cmp.contextPetId()).toBe('pet-1');
    });

    it('kayıt sürümüyle yüklenir ve PUT a rowVersion ile mevcut appointmentId gönderilir', () => {
        service.updateExamination.mockReturnValue(of({ id: 'e1', rowVersion: 'V2' }));
        typeNote('3 gündür az yiyor');
        cmp.onSubmit();

        expect(service.updateExamination).toHaveBeenCalledTimes(1);
        const [id, payload] = vi.mocked(service.updateExamination).mock.lastCall!;

        expect(id).toBe('e1');
        expect(payload.rowVersion).toBe('V1');
        expect(payload.appointmentId).toBe('appt-1');
        expect(payload.clinicId).toBe('clinic-1');
        expect(payload.petId).toBe('pet-1');
        expect(payload.anamnesis).toBe('3 gündür az yiyor');
    });

    it('409 çakışmasında yazılan metin korunur, uyarı gösterilir, rowVersion sessizce yenilenmez', () => {
        service.updateExamination.mockReturnValue(throwError(() => httpError(409, 'Examinations.ConcurrencyConflict')));
        typeNote('B nin yazdığı anamnez');
        cmp.onSubmit();

        expect(cmp.conflict()).toBe(true);
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
        service.updateExamination.mockReturnValue(throwError(() => httpError(409, 'Examinations.ConcurrencyConflict')));
        typeNote('x');
        cmp.onSubmit();
        cmp.onSubmit();
        expect(vi.mocked(service.updateExamination).mock.calls[1][1].rowVersion).toBe('V1');
    });

    it('doğrulama hatasında (400) metin korunur ve alan hatası gösterilir; çakışma değildir', () => {
        service.updateExamination.mockReturnValue(
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

        expect(cmp.conflict()).toBe(false);
        expect(cmp.apiFieldErrors().plan).toBe('Çok uzun');
        expect(cmp.form.controls.anamnesis.value).toBe('korunmalı');
    });

    it('ağ hatasında (status 0) metin korunur', () => {
        service.updateExamination.mockReturnValue(throwError(() => httpError(0)));
        typeNote('ağ koptu');
        cmp.onSubmit();

        expect(cmp.submitError()).toBeTruthy();
        expect(cmp.conflict()).toBe(false);
        expect(cmp.form.controls.anamnesis.value).toBe('ağ koptu');
        expect(cmp.form.controls.visitReason.value).toBe('İştahsızlık — güncellendi');
    });

    it('boşaltılan metin alanı PUT ta "" olarak gider', () => {
        service.getExaminationForEditById.mockReturnValue(of(editVm({ plan: 'eski plan', notes: 'eski not' })));
        cmp.reload();
        service.updateExamination.mockReturnValue(of({ id: 'e1', rowVersion: 'V2' }));
        cmp.form.controls.plan.setValue('');
        cmp.onSubmit();

        const payload = vi.mocked(service.updateExamination).mock.lastCall![1];

        expect(payload.plan).toBe('');
        expect(payload.notes).toBe('eski not');
    });

    it('kayıttaki tüm vitaller boşaltılırsa clearVitals:true gider', () => {
        service.getExaminationForEditById.mockReturnValue(of(editVm({ weightKg: 4.25, temperatureC: 38.6 })));
        cmp.reload();
        service.updateExamination.mockReturnValue(of({ id: 'e1', rowVersion: 'V2' }));
        cmp.form.patchValue({ weightKg: null, temperatureC: null });
        cmp.onSubmit();

        const first = vi.mocked(service.updateExamination).mock.calls[0][1];

        expect(first.clearVitals).toBe(true);
        expect(first.weightKg).toBeNull();
    });

    it('tek vitali silmek (diğeri kalırken) engellenir ve kayıt gönderilmez', () => {
        service.getExaminationForEditById.mockReturnValue(of(editVm({ weightKg: 4.25, temperatureC: 38.6 })));
        cmp.reload();
        cmp.form.controls.weightKg.setValue(null);

        expect(cmp.form.hasError('partialVitalClear')).toBe(true);
        expect(cmp.saveDisabled()).toBe(true);
        cmp.onSubmit();
        expect(service.updateExamination).not.toHaveBeenCalled();
    });

    it('vital değer varken PUT ta clearVitals gönderilmez', () => {
        service.getExaminationForEditById.mockReturnValue(of(editVm({ weightKg: 4.25 })));
        cmp.reload();
        service.updateExamination.mockReturnValue(of({ id: 'e1', rowVersion: 'V2' }));
        cmp.form.controls.weightKg.setValue(5);
        cmp.onSubmit();

        const payload = vi.mocked(service.updateExamination).mock.lastCall![1];

        expect(payload.clearVitals).toBe(false);
        expect(payload.weightKg).toBe(5);
    });

    it('başarılı güncellemede muayene detayına ?saved=1 ile yönlenir', () => {
        service.updateExamination.mockReturnValue(of({ id: 'e1', rowVersion: 'V2' }));
        typeNote('yeni anamnez');
        cmp.onSubmit();

        expect(navigate).toHaveBeenCalledTimes(1);

        expect(navigate).toHaveBeenCalledWith(['/panel/examinations', 'e1'], { queryParams: { saved: '1' } });
    });

    it('kayıt sürerken ikinci gönderim yoksayılır; başarıdan sonra da yeniden gönderilmez', () => {
        const inFlight = new Subject<{
            id: string;
            rowVersion: string;
        }>();

        service.updateExamination.mockReturnValue(inFlight);
        typeNote('x');
        cmp.onSubmit();
        cmp.onSubmit();
        inFlight.next({ id: 'e1', rowVersion: 'V2' });
        inFlight.complete();
        cmp.onSubmit();

        expect(service.updateExamination).toHaveBeenCalledTimes(1);
    });

    for (const [name, err] of [
        ['400', new HttpErrorResponse({ status: 400, error: { extensions: { code: 'Examinations.Validation' }, detail: 'Geçersiz istek' } })],
        ['409', httpError(409, 'Examinations.ConcurrencyConflict')],
        ['ağ', httpError(0)]
    ] as const) {
        it(`${name} hatasında formda kalınır, satır içi mesaj gösterilir ve metin korunur`, () => {
            service.updateExamination.mockReturnValue(throwError(() => err));
            typeNote('korunmalı');
            cmp.onSubmit();

            expect(navigate).not.toHaveBeenCalled();
            expect(cmp.submitError()).toBeTruthy();
            expect(cmp.form.controls.anamnesis.value).toBe('korunmalı');
            expect(cmp.saveDisabled()).toBe(false);
        });
    }

    it('yeni muayene başarıyla oluşturulunca detaya ?saved=1 ile yönlenir', () => {
        const route = TestBed.inject(ActivatedRoute) as unknown as {
            snapshot: {
                paramMap: unknown;
                routeConfig: {
                    path: string;
                };
            };
        };

        route.snapshot.paramMap = convertToParamMap({});
        route.snapshot.routeConfig = { path: 'new' };
        service.createExamination.mockReturnValue(of({ id: 'n1', rowVersion: 'A' }));
        const created = TestBed.createComponent(ExaminationWorkspacePageComponent);

        created.detectChanges();
        const c = created.componentInstance;

        c.selectionForm.controls.clientId.setValue('client-1', { emitEvent: false });
        c.selectionForm.controls.petId.enable({ emitEvent: false });
        c.selectionForm.controls.petId.setValue('pet-1', { emitEvent: false });
        c.form.patchValue({ examinationDate: '2026-10-08', examinationTime: '13:30', visitReason: 'Kontrol' });
        c.onSubmit();

        expect(service.createExamination).toHaveBeenCalledTimes(1);
        expect(navigate).toHaveBeenCalledWith(['/panel/examinations', 'n1'], { queryParams: { saved: '1' } });
    });

    it('findings boş olsa da form geçerlidir; tek zorunlu klinik alan visitReason dır', () => {
        expect(cmp.form.valid).toBe(true);
        cmp.form.controls.visitReason.setValue('   ');
        expect(cmp.form.controls.visitReason.valid).toBe(false);
    });

    it('vital değer 0 veya negatifse geçersiz, boşsa geçerlidir', () => {
        cmp.form.controls.weightKg.setValue(0);
        expect(cmp.form.controls.weightKg.valid).toBe(false);
        cmp.form.controls.weightKg.setValue(null);
        expect(cmp.form.controls.weightKg.valid).toBe(true);
        cmp.form.controls.heartRateBpm.setValue(80.5);
        expect(cmp.form.controls.heartRateBpm.valid).toBe(false);
    });

    it('kesinleşmiş muayene açılınca form kilitlenir, uyarı görünür ve kayıt gönderilmez', () => {
        service.getExaminationForEditById.mockReturnValue(of(editVm({ status: 'Finalized' })));
        cmp.reload();
        fixture.detectChanges();

        expect(cmp.finalized()).toBe(true);
        expect(cmp.form.disabled).toBe(true);
        expect(cmp.saveDisabled()).toBe(true);
        expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="finalized-notice"]')).not.toBeNull();
        expect((fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="clinical-term-picker"]').length).toBe(0);

        cmp.onSubmit();
        expect(service.updateExamination).not.toHaveBeenCalled();
    });

    it('taslak muayene yeniden yüklenince form açık kalır', () => {
        service.getExaminationForEditById.mockReturnValue(of(editVm({ status: 'Finalized' })));
        cmp.reload();
        service.getExaminationForEditById.mockReturnValue(of(editVm({ status: 'Draft' })));
        cmp.reload();

        expect(cmp.finalized()).toBe(false);
        expect(cmp.form.enabled).toBe(true);
    });

    it('taslak muayenede şikâyet ve tanı alanlarının altında sözlük seçicisi görünür', () => {
        service.getExaminationForEditById.mockReturnValue(of(editVm({ status: 'Draft' })));
        cmp.reload();
        fixture.detectChanges();

        const el = fixture.nativeElement as HTMLElement;

        expect(el.querySelectorAll('[data-testid="clinical-term-picker"]').length).toBe(2);
        expect(el.querySelector('#visitReasonTerm')).not.toBeNull();
        expect(el.querySelector('#assessmentTerm')).not.toBeNull();
    });
});
