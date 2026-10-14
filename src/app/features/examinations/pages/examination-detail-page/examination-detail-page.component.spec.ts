import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, EMPTY } from 'rxjs';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import type { ExaminationDetailVm } from '@/app/features/examinations/models/examination-vm.model';
import { AdministrationsService } from '@/app/features/administrations/services/administrations.service';
import { StockBatchService } from '@/app/features/inventory/services/stock-batch.service';
import { ProductService } from '@/app/features/inventory/services/product.service';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { TreatmentsService } from '@/app/features/treatments/services/treatments.service';
import { VaccinationsService } from '@/app/features/vaccinations/services/vaccinations.service';
import { DetailRelatedSummariesService } from '@/app/shared/panel/detail-related-summaries.service';
import { ExaminationDetailPageComponent } from './examination-detail-page.component';

const detailVm: ExaminationDetailVm = {
    id: 'e1',
    clinicId: 'clinic-1',
    clinicName: null,
    examinedAtUtc: '2026-10-08T10:30:00Z',
    clientId: 'client-1',
    clientName: 'Ali Veli',
    petId: 'pet-1',
    petName: 'Pamuk',
    appointmentId: null,
    visitReason: 'İştahsızlık',
    notes: '—',
    findings: '—',
    assessment: '—',
    anamnesis: '—',
    plan: '—',
    weightKg: null,
    temperatureC: null,
    heartRateBpm: null,
    respiratoryRatePerMin: null,
    vitalsMeasuredAtUtc: null,
    status: 'Draft',
    finalizedAtUtc: null,
    finalizedByName: null,
    rowVersion: 'V1',
    createdAtUtc: null,
    updatedAtUtc: null
};

describe('ExaminationDetailPageComponent — kayıt sonrası toast', () => {
    const create = (queryParams: Record<string, string>) => {
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        const route = TestBed.inject(ActivatedRoute) as unknown as { snapshot: { queryParamMap: unknown } };
        route.snapshot.queryParamMap = convertToParamMap(queryParams);
        const fixture = TestBed.createComponent(ExaminationDetailPageComponent);
        const toastAdd = spyOn(fixture.debugElement.injector.get(MessageService), 'add');
        fixture.detectChanges();

        return { navigate, toastAdd };
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ExaminationDetailPageComponent],
            providers: [
                provideRouter([]),
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { queryParamMap: convertToParamMap({}) }, paramMap: of(convertToParamMap({ id: 'e1' })) }
                },
                {
                    provide: ExaminationsService,
                    useValue: {
                        getExaminationById: () => of(detailVm),
                        getExaminationRelatedSummary: () => of({ examinationId: 'e1' })
                    }
                },
                {
                    provide: DetailRelatedSummariesService,
                    useValue: {
                        loadSiblingExaminationsForPet: () => of([]),
                        loadRecentAppointmentsForPetChronological: () => of([])
                    }
                },
                { provide: AdministrationsService, useValue: { getAdministrations: () => of({ items: [], page: 1, pageSize: 50, totalItems: 0, totalPages: 0 }) } },
                { provide: ProductService, useValue: { getProducts: () => of({ items: [], page: 1, pageSize: 200, totalItems: 0, totalPages: 0 }) } },
                { provide: StockBatchService, useValue: { getByProduct: () => EMPTY } },
                { provide: VaccinationsService, useValue: { getVaccinations: () => EMPTY } },
                { provide: TreatmentsService, useValue: { getTreatments: () => EMPTY } },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        }).compileComponents();
    });

    it('?saved=1 ile açılınca "Muayene kaydedildi." toast ı gösterilir ve işaret URL den kaldırılır', () => {
        const { navigate, toastAdd } = create({ saved: '1' });

        expect(toastAdd).toHaveBeenCalledOnceWith(
            jasmine.objectContaining({ severity: 'success', detail: 'Muayene kaydedildi.' })
        );
        expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { saved: null }, replaceUrl: true }));
    });

    it('işaret yokken toast gösterilmez', () => {
        const { navigate, toastAdd } = create({});

        expect(toastAdd).not.toHaveBeenCalled();
        expect(navigate).not.toHaveBeenCalled();
    });
});

describe('ExaminationDetailPageComponent — kesinleştirme ve ek not', () => {
    const finalizedVm: ExaminationDetailVm = {
        ...detailVm,
        status: 'Finalized',
        finalizedAtUtc: '2026-10-11T09:30:00Z',
        finalizedByName: 'Dr. Ayşe',
        rowVersion: 'V2'
    };

    const setup = async (vm: ExaminationDetailVm, claims: string[], relatedSummary: object = { examinationId: 'e1' }) => {
        const service = jasmine.createSpyObj<ExaminationsService>('ExaminationsService', [
            'getExaminationById',
            'getExaminationRelatedSummary',
            'getAddenda',
            'finalizeExamination'
        ]);
        service.getExaminationById.and.returnValue(of(vm));
        service.getExaminationRelatedSummary.and.returnValue(of(relatedSummary) as never);
        service.getAddenda.and.returnValue(of([{ id: 'a1', reason: 'Hatalı kilo', text: 'Doğru kilo 12,4', createdAtUtc: '2026-10-11T10:05:00Z', createdByName: 'Dr. Ayşe' }]));
        await TestBed.configureTestingModule({
            imports: [ExaminationDetailPageComponent],
            providers: [
                provideRouter([]),
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { queryParamMap: convertToParamMap({}) }, paramMap: of(convertToParamMap({ id: 'e1' })) }
                },
                { provide: ExaminationsService, useValue: service },
                {
                    provide: DetailRelatedSummariesService,
                    useValue: {
                        loadSiblingExaminationsForPet: () => of([]),
                        loadRecentAppointmentsForPetChronological: () => of([])
                    }
                },
                { provide: AdministrationsService, useValue: { getAdministrations: () => of({ items: [], page: 1, pageSize: 50, totalItems: 0, totalPages: 0 }) } },
                { provide: ProductService, useValue: { getProducts: () => of({ items: [], page: 1, pageSize: 200, totalItems: 0, totalPages: 0 }) } },
                { provide: StockBatchService, useValue: { getByProduct: () => EMPTY } },
                { provide: VaccinationsService, useValue: { getVaccinations: () => EMPTY } },
                { provide: TreatmentsService, useValue: { getTreatments: () => EMPTY } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        }).compileComponents();
        const fixture = TestBed.createComponent(ExaminationDetailPageComponent);
        fixture.detectChanges();
        return { fixture, service, el: fixture.nativeElement as HTMLElement };
    };
    const has = (el: HTMLElement, testId: string) => el.querySelector(`[data-testid="${testId}"]`) !== null;
    const label = (el: HTMLElement) => el.textContent ?? '';

    it('Veteriner (Finalize+Update) taslakta Kesinleştir ve Düzenle görür; ek not bölümü yok', async () => {
        const { el } = await setup(detailVm, ['Examinations.Update', 'Examinations.Finalize', 'Examinations.Addendum']);

        expect(has(el, 'finalize-open')).toBeTrue();
        expect(label(el)).toContain('Düzenle');
        expect(has(el, 'addenda-section')).toBeFalse();
        expect(label(el)).toContain('Taslak');
    });

    it('Sekreter (izinsiz) taslakta Kesinleştir görmez', async () => {
        const { el } = await setup(detailVm, ['Examinations.Read']);

        expect(has(el, 'finalize-open')).toBeFalse();
    });

    it('kesinleşmiş muayenede Düzenle ve Kesinleştir gizli; kesinleştiren ve ek notlar görünür', async () => {
        const { el } = await setup(finalizedVm, ['Examinations.Update', 'Examinations.Finalize', 'Examinations.Addendum']);

        expect(has(el, 'finalize-open')).toBeFalse();
        expect(el.querySelector('a[href$="/e1/edit"]')).toBeNull();
        expect(label(el)).toContain('Kesinleşti');
        expect(el.querySelector('[data-testid="finalized-info"]')?.textContent).toContain('Dr. Ayşe');
        expect(el.querySelectorAll('[data-testid="addendum-item"]').length).toBe(1);
        expect(has(el, 'addendum-open')).toBeTrue();
    });

    const ADD_CLAIMS = ['Treatments.Create', 'Prescriptions.Create', 'Vaccinations.Create', 'LabResults.Create', 'Hospitalizations.Create'];
    const addButton = (el: HTMLElement, kind: string) => el.querySelector(`[data-testid="procedure-add-${kind}"] button`) as HTMLButtonElement | null;

    it('taslakta işlem ekleme düğmeleri tek İşlemler bölümünde etkin görünür; kilit nedeni yok', async () => {
        const { el } = await setup(detailVm, ADD_CLAIMS);

        expect(has(el, 'procedures-section')).toBeTrue();
        for (const kind of ['treatment', 'prescription', 'vaccination', 'lab', 'hospitalization']) {
            expect(addButton(el, kind)).withContext(kind).not.toBeNull();
            expect(addButton(el, kind)?.disabled).withContext(kind).toBeFalse();
        }
        expect(has(el, 'procedure-lock-reason')).toBeFalse();
        expect(el.querySelector('a[href*="/panel/treatments/new"]')).toBeNull();
    });

    it('işlem ekleme düğmeleri yalnız ilgili Create yetkisiyle görünür', async () => {
        const { el } = await setup(detailVm, ['Treatments.Create', 'LabResults.Create']);

        expect(addButton(el, 'treatment')).not.toBeNull();
        expect(addButton(el, 'lab')).not.toBeNull();
        for (const kind of ['prescription', 'vaccination', 'hospitalization']) {
            expect(addButton(el, kind)).withContext(kind).toBeNull();
        }
    });

    it('yetkisiz kullanıcı İşlemler listesini görür ama ekleme çubuğu çizilmez', async () => {
        const { el } = await setup(detailVm, ['Examinations.Read']);

        expect(has(el, 'procedures-section')).toBeTrue();
        expect(has(el, 'procedure-add-bar')).toBeFalse();
    });

    it('hasta bandı ve uyarı rozet alanı muayene sayfasında çizilir', async () => {
        const { el } = await setup(detailVm, ['Examinations.Read']);

        expect(el.querySelector('app-examination-patient-header')).not.toBeNull();
    });

    it('Ödeme Oluştur yalnız Payments.Create izniyle görünür (Update tek başına yetmez)', async () => {
        const hekim = await setup(detailVm, ['Examinations.Update']);
        expect(hekim.el.querySelector('a[href*="/panel/payments/new"]')).toBeNull();
        TestBed.resetTestingModule();

        const yetkili = await setup(detailVm, ['Examinations.Update', 'Payments.Create']);
        expect(yetkili.el.querySelector('a[href*="/panel/payments/new"]')).not.toBeNull();
    });

    it('"Tümü →" bağlantıları hayvan bağlamını (petId) taşır', async () => {
        const { el } = await setup(detailVm, ['Examinations.Read']);

        for (const path of ['payments', 'examinations', 'appointments']) {
            const a = Array.from(el.querySelectorAll(`a[href^="/panel/${path}?"]`));
            expect(a.length).withContext(path).toBeGreaterThan(0);
            expect(a[0].getAttribute('href')).withContext(path).toContain('petId=pet-1');
        }
    });

    it('kesinleşmiş muayenede tedavi/reçete/aşı düğmeleri kilitli ve neden görünür; lab ve yatış açık kalır', async () => {
        const { el } = await setup(finalizedVm, ADD_CLAIMS);

        for (const kind of ['treatment', 'prescription', 'vaccination']) {
            expect(addButton(el, kind)?.disabled).withContext(kind).toBeTrue();
        }
        expect(addButton(el, 'lab')?.disabled).toBeFalse();
        expect(addButton(el, 'hospitalization')?.disabled).toBeFalse();
        expect(el.querySelector('[data-testid="procedure-lock-reason"]')?.textContent).toContain('yalnız gerekçeli uygulama ve ek not eklenebilir');
    });

    it('kesinleştirme onayı eksik tanı ve işlem uyarılarını listeler ama engellemez', async () => {
        const { fixture } = await setup(detailVm, ['Examinations.Update', 'Examinations.Finalize']);

        const warnings = fixture.componentInstance.finalizeWarnings();
        expect(warnings.some((w) => w.includes('tanı'))).toBeTrue();
        expect(warnings.some((w) => w.includes('Plan'))).toBeTrue();
        expect(warnings.some((w) => w.includes('Muayeneye bağlı'))).toBeTrue();
    });

    it('çalışma alanı: solda hasta bağlamı, ortada kayıt, sağda kesinleştirme kontrol listesi', async () => {
        const { el } = await setup(detailVm, ['Examinations.Read', 'Examinations.Finalize']);

        const workspace = el.querySelector('[data-testid="exam-workspace"]')!;
        const order = Array.from(workspace.querySelectorAll('[data-testid="patient-context"], [data-testid="exam-record"], [data-testid="finalize-checklist"]')).map((x) =>
            x.getAttribute('data-testid')
        );
        expect(order).toEqual(['patient-context', 'exam-record', 'finalize-checklist']);
        expect(workspace.querySelector('[data-testid="procedures-section"]')).not.toBeNull();
    });

    it('boş metin bölümleri tek satırda toplanır; vital yoksa satır "Ölçülmemiş" der', async () => {
        const { el } = await setup(detailVm, ['Examinations.Read']);

        const record = el.querySelector('[data-testid="exam-record"]')!;
        expect(record.querySelector('[data-testid="record-empty-sections"]')?.textContent).toContain(
            'Anamnez, Klinik bulgular, Değerlendirme / tanı, Plan / tedavi planı, Ek notlar'
        );
        expect(Array.from(record.querySelectorAll('h5')).map((h) => h.textContent?.trim())).toEqual(['Şikâyet / ziyaret sebebi', 'Vital']);
        expect(record.querySelector('[data-testid="vital-row"]')?.textContent).toContain('Ölçülmemiş');
        expect(record.querySelector('app-empty-state')).toBeNull();
    });

    it('vital satırı yalnız ölçülen değerleri birimiyle tek satırda gösterir', async () => {
        const { el } = await setup({ ...detailVm, weightKg: 4.25, temperatureC: 38.6, findings: 'Mukozalar soluk' }, ['Examinations.Read']);

        const vitals = Array.from(el.querySelectorAll('[data-testid="vital"]')).map((v) => Array.from(v.children).map((c) => c.textContent?.trim()));
        expect(vitals).toEqual([
            ['Kilo', '4.25 kg'],
            ['Sıcaklık', '38.6 °C']
        ]);
        expect(el.querySelector('[data-testid="record-empty-sections"]')?.textContent).not.toContain('Klinik bulgular');
    });

    it('kontrol listesi eksik maddeleri uyarı olarak gösterir; ücret bekleyen madde Ücretlendir bağlantısı taşır', async () => {
        const { el } = await setup({ ...detailVm, assessment: 'Gastrit' }, ['Examinations.Read'], { examinationId: 'e1', pendingChargeCount: 2 });

        const item = (key: string) => el.querySelector(`[data-testid="check-${key}"]`);
        expect(item('assessment')?.getAttribute('data-ok')).toBe('true');
        expect(item('plan')?.getAttribute('data-ok')).toBe('false');
        expect(item('pendingCharges')?.getAttribute('data-ok')).toBe('false');
        expect(el.querySelector('[data-testid="pending-charges-link"]')?.getAttribute('href')).toContain('examinationId=e1');
    });

    it('kesinleşmiş muayenede kontrol listesi yerine kilit nedeni görünür', async () => {
        const { el } = await setup({ ...detailVm, status: 'Finalized', finalizedAtUtc: '2026-10-11T09:30:00Z', finalizedByName: 'Dr. Ayşe' }, ['Examinations.Read']);

        const panel = el.querySelector('[data-testid="finalize-checklist"]')?.textContent ?? '';
        expect(panel).toContain('yalnız gerekçeli uygulama ve ek not eklenebilir');
        expect(el.querySelector('[data-testid="check-plan"]')).toBeNull();
    });

    it('Addendum izni olmayan kullanıcı ek notları okur ama "Ek not ekle" görmez', async () => {
        const { el } = await setup(finalizedVm, ['Examinations.Read']);

        expect(el.querySelectorAll('[data-testid="addendum-item"]').length).toBe(1);
        expect(has(el, 'addendum-open')).toBeFalse();
    });

    const TEMPLATE_CLAIMS = ['ExaminationTemplates.Read', 'ExaminationTemplates.Apply', 'Examinations.Update', 'Administrations.Create'];

    it('Şablon uygula taslakta dört izin birlikteyken görünür; biri eksikse veya muayene kesinleşmişse görünmez', async () => {
        expect(has((await setup(detailVm, TEMPLATE_CLAIMS)).el, 'template-apply-open')).toBeTrue();
        TestBed.resetTestingModule();
        expect(has((await setup(detailVm, TEMPLATE_CLAIMS.filter((c) => c !== 'Administrations.Create'))).el, 'template-apply-open')).toBeFalse();
        TestBed.resetTestingModule();
        expect(has((await setup(finalizedVm, TEMPLATE_CLAIMS)).el, 'template-apply-open')).toBeFalse();
    });

    it('şablon uygulandıktan sonra muayene ve ilgili kayıt özeti yeniden okunur', async () => {
        const { fixture, service } = await setup(detailVm, TEMPLATE_CLAIMS);
        service.getExaminationById.and.returnValue(of({ ...detailVm, visitReason: 'İştahsızlık, Kulak kaşıntısı', rowVersion: 'V2' }));
        const relatedBefore = service.getExaminationRelatedSummary.calls.count();

        fixture.componentInstance.onTemplateApplied({
            template: { id: 't1', name: 'Otitis paketi', visitReason: 'Kulak kaşıntısı', findings: null, plan: null, isActive: true, isSystem: false, lines: [], rowVersion: 'T1' },
            result: { examinationId: 'e1', rowVersion: 'V2', updatedFields: ['visitReason'], administrations: [], services: [] }
        });

        expect(fixture.componentInstance.exam()?.rowVersion).toBe('V2');
        expect(fixture.componentInstance.exam()?.visitReason).toContain('Kulak kaşıntısı');
        expect(service.getExaminationRelatedSummary.calls.count()).toBe(relatedBefore + 1);
    });

    it('kesinleştirme sonrası durum Kesinleşti olur, sürüm yenilenir ve düğme kalkar', async () => {
        const { fixture, service, el } = await setup(detailVm, ['Examinations.Update', 'Examinations.Finalize']);
        service.getExaminationById.and.returnValue(of(finalizedVm));

        fixture.componentInstance.onFinalized({ id: 'e1', rowVersion: 'V2', status: 'Finalized', finalizedAtUtc: '2026-10-11T09:30:00Z' });
        fixture.detectChanges();

        expect(fixture.componentInstance.exam()?.status).toBe('Finalized');
        expect(fixture.componentInstance.exam()?.rowVersion).toBe('V2');
        expect(has(el, 'finalize-open')).toBeFalse();
    });
});
