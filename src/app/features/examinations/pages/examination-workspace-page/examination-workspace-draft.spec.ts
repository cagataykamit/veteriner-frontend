import type { Mock, MockedObject } from 'vitest';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { EMPTY, of } from 'rxjs';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import { AppointmentsService } from '@/app/entities/appointment/services/appointments.service';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import type { ExaminationEditVm } from '@/app/entities/examination/models/examination-vm.model';
import { ExaminationsService } from '@/app/entities/examination/services/examinations.service';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import { DetailRelatedSummariesService } from '@/app/entities/patient/services/detail-related-summaries.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { readSessionDraft, sessionDraftKey, writeSessionDraft } from '@/app/shared/utils/session-draft.storage';
import { ExaminationWorkspacePageComponent } from './examination-workspace-page.component';

const editVm = (over: Partial<ExaminationEditVm> = {}): ExaminationEditVm => ({
    id: 'e1',
    clinicId: 'clinic-1',
    clientId: 'client-1',
    petId: 'pet-1',
    clientName: 'Ali Veli',
    petName: 'Pamuk',
    appointmentId: null,
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

const EDIT_KEY = sessionDraftKey('muayene', 'user-1', 'clinic-1', 'kayit', 'e1');
const NEW_KEY = sessionDraftKey('muayene', 'user-1', 'clinic-1', 'yeni', 'serbest');

describe('ExaminationWorkspacePageComponent — tarayıcı taslağı (B3)', () => {
    let service: MockedObject<ExaminationsService>;
    let navigate: Mock;
    let route: { snapshot: { paramMap: ReturnType<typeof convertToParamMap>; queryParamMap: ReturnType<typeof convertToParamMap>; routeConfig: { path: string } } };

    beforeEach(async () => {
        // debounceTime süreyi Date.now() ile ölçer: tarih de sahte olmalı.
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-11-16T10:00:00+03:00'));
        service = {
            getExaminationForEditById: vi.fn().mockReturnValue(of(editVm())),
            updateExamination: vi.fn(),
            createExamination: vi.fn()
        } as unknown as MockedObject<ExaminationsService>;
        route = { snapshot: { paramMap: convertToParamMap({ id: 'e1' }), queryParamMap: convertToParamMap({}), routeConfig: { path: ':id/edit' } } };

        await TestBed.configureTestingModule({
            imports: [ExaminationWorkspacePageComponent],
            providers: [
                provideRouter([]),
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
                { provide: ExaminationsService, useValue: service },
                { provide: ActivatedRoute, useValue: route },
                { provide: AuthService, useValue: { getClinicName: () => 'Klinik', getClinicId: () => 'clinic-1', getUserId: () => 'user-1', hasOperationClaim: () => true } },
                { provide: AppointmentsService, useValue: {} },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                {
                    provide: PetsService,
                    useValue: {
                        getPetById: () => of({ name: 'Pamuk', speciesName: 'Kedi', breed: 'Van', birthDate: null }),
                        getPetSummary: () => EMPTY,
                        getPets: () => of({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 })
                    }
                },
                { provide: DetailRelatedSummariesService, useValue: { loadSiblingExaminationsForPet: () => of([]) } },
                { provide: ClientsService, useValue: { getClientById: () => of({ fullName: 'Ali Veli', phone: '555', email: '—' }) } }
            ]
        }).compileComponents();
        navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true) as unknown as Mock;
    });

    afterEach(() => {
        sessionStorage.clear();
        vi.useRealTimers();
    });

    const open = () => {
        const fixture = TestBed.createComponent(ExaminationWorkspacePageComponent);

        fixture.detectChanges();

        return { fixture, cmp: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
    };

    it('yazdıkça kısa gecikmeyle sessionStorage a yazılır (kayıt sürümüyle); değişiklik yokken yazılmaz', () => {
        const { cmp } = open();

        vi.advanceTimersByTime(1000);
        expect(readSessionDraft(EDIT_KEY)).toBeNull();

        cmp.form.controls.anamnesis.setValue('Kusma iki gündür');
        cmp.form.controls.anamnesis.markAsDirty();
        vi.advanceTimersByTime(399);
        expect(readSessionDraft(EDIT_KEY)).toBeNull();
        vi.advanceTimersByTime(1);

        const draft = readSessionDraft<{ form: { anamnesis: string }; rowVersion: string; selection: unknown }>(EDIT_KEY);

        expect(draft?.data.form.anamnesis).toBe('Kusma iki gündür');
        expect(draft?.data.rowVersion).toBe('V1');
        expect(draft?.data.selection).toBeNull();
    });

    it('sayfa yeniden açılınca sorulur; Sürdür formu doldurur ve kaydedilmemiş değişiklik sayar', () => {
        writeSessionDraft(EDIT_KEY, { form: { ...open().cmp.form.getRawValue(), anamnesis: 'Taslaktaki anamnez' }, selection: null, rowVersion: 'V1' });
        const { cmp, fixture, el } = open();

        expect(el.querySelector('[data-testid="examination-draft-prompt"]')?.textContent).toContain('Kaydedilmemiş taslağınız var, sürdürülsün mü?');
        expect(cmp.pendingDraft()?.stale).toBe(false);

        el.querySelector<HTMLButtonElement>('[data-testid="examination-draft-resume"]')!.click();
        fixture.detectChanges();

        expect(cmp.form.controls.anamnesis.value).toBe('Taslaktaki anamnez');
        expect(cmp.hasUnsavedChanges()).toBe(true);
        expect(el.querySelector('[data-testid="examination-draft-prompt"]')).toBeNull();
    });

    it('soru yanıtlanmadan yazılanlar taslağın üstüne yazılmaz; Taslağı sil taslağı kaldırır', () => {
        writeSessionDraft(EDIT_KEY, { form: { anamnesis: 'eski' }, selection: null, rowVersion: 'V1' });
        const { cmp, el } = open();

        cmp.form.controls.notes.setValue('yeni not');
        cmp.form.controls.notes.markAsDirty();
        vi.advanceTimersByTime(500);
        expect(readSessionDraft<{ form: { anamnesis: string } }>(EDIT_KEY)?.data.form.anamnesis).toBe('eski');

        el.querySelector<HTMLButtonElement>('[data-testid="examination-draft-discard"]')!.click();

        expect(readSessionDraft(EDIT_KEY)).toBeNull();
        expect(cmp.pendingDraft()).toBeNull();
    });

    it('kayıt taslaktan sonra değiştiyse uyarı gösterilir', () => {
        writeSessionDraft(EDIT_KEY, { form: { anamnesis: 'eski' }, selection: null, rowVersion: 'V0' });
        const { cmp } = open();

        expect(cmp.pendingDraft()?.stale).toBe(true);
    });

    it('başarılı kayıtta taslak silinir', () => {
        service.updateExamination.mockReturnValue(of({ id: 'e1', rowVersion: 'V2' }));
        const { cmp } = open();

        cmp.form.controls.anamnesis.setValue('Kusma');
        cmp.form.controls.anamnesis.markAsDirty();
        vi.advanceTimersByTime(400);
        expect(readSessionDraft(EDIT_KEY)).not.toBeNull();

        cmp.onSubmit();

        expect(readSessionDraft(EDIT_KEY)).toBeNull();
    });

    it('Vazgeç sayfadan çıkınca taslağı siler; "Sayfada kal" denirse taslak kalır', async () => {
        const { cmp } = open();

        writeSessionDraft(EDIT_KEY, { form: { anamnesis: 'x' }, selection: null, rowVersion: 'V1' });
        navigate.mockResolvedValueOnce(false);
        cmp.onCancel();
        await Promise.resolve();
        await Promise.resolve();
        expect(readSessionDraft(EDIT_KEY)).not.toBeNull();

        cmp.onCancel();
        await Promise.resolve();
        await Promise.resolve();
        expect(readSessionDraft(EDIT_KEY)).toBeNull();
    });

    it('kesinleşmiş muayenede taslak sorulmaz ve silinir', () => {
        service.getExaminationForEditById.mockReturnValue(of(editVm({ status: 'Finalized' })));
        writeSessionDraft(EDIT_KEY, { form: { anamnesis: 'x' }, selection: null, rowVersion: 'V1' });
        const { cmp } = open();

        expect(cmp.pendingDraft()).toBeNull();
        expect(readSessionDraft(EDIT_KEY)).toBeNull();
    });

    it('serbest yeni muayenede hasta seçimi de taslağa girer ve sürdürünce geri gelir', () => {
        route.snapshot.paramMap = convertToParamMap({});
        route.snapshot.routeConfig = { path: 'new' };
        const first = open().cmp;

        first.selectionForm.controls.clientId.setValue('client-1');
        first.selectionForm.controls.petId.setValue('pet-1');
        first.form.controls.visitReason.setValue('Kontrol');
        first.form.controls.visitReason.markAsDirty();
        vi.advanceTimersByTime(400);

        expect(readSessionDraft<{ selection: { clientId: string; petId: string } }>(NEW_KEY)?.data.selection).toEqual({ clientId: 'client-1', petId: 'pet-1' });

        const { cmp } = open();

        cmp.resumeDraft();

        expect(cmp.selectionForm.controls.clientId.value).toBe('client-1');
        expect(cmp.selectionForm.controls.petId.value).toBe('pet-1');
        expect(cmp.form.controls.visitReason.value).toBe('Kontrol');
    });
});
