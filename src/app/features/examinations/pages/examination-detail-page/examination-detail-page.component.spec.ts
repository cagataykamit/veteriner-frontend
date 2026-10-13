import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, EMPTY } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { ExaminationDetailVm } from '@/app/features/examinations/models/examination-vm.model';
import { AdministrationsService } from '@/app/features/administrations/services/administrations.service';
import { StockBatchService } from '@/app/features/inventory/services/stock-batch.service';
import { ProductService } from '@/app/features/inventory/services/product.service';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
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

    const setup = async (vm: ExaminationDetailVm, claims: string[]) => {
        const service = jasmine.createSpyObj<ExaminationsService>('ExaminationsService', [
            'getExaminationById',
            'getExaminationRelatedSummary',
            'getAddenda',
            'finalizeExamination'
        ]);
        service.getExaminationById.and.returnValue(of(vm));
        service.getExaminationRelatedSummary.and.returnValue(of({ examinationId: 'e1' }) as never);
        service.getAddenda.and.returnValue(of([{ id: 'a1', reason: 'Hatalı kilo', text: 'Doğru kilo 12,4', createdAtUtc: '2026-10-11T10:05:00Z', createdByName: 'Dr. Ayşe' }]));
        await TestBed.configureTestingModule({
            imports: [ExaminationDetailPageComponent],
            providers: [
                provideRouter([]),
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

    it('taslakta tedavi/reçete/aşı/lab/yatış oluşturma bağlantıları muayene bağlamıyla görünür; kilit ipucu yok', async () => {
        const { el } = await setup(detailVm, ['Examinations.Update']);

        for (const path of ['treatments', 'prescriptions', 'vaccinations', 'lab-results', 'hospitalizations']) {
            const a = el.querySelector(`a[href*="/panel/${path}/new"]`);
            expect(a).withContext(path).not.toBeNull();
            expect(a?.getAttribute('href')).toContain('examinationId=e1');
            expect(a?.getAttribute('href')).toContain('clientId=client-1');
            expect(a?.getAttribute('href')).toContain('petId=pet-1');
        }
        expect(has(el, 'finalized-locked-hint')).toBeFalse();
    });

    it('kesinleşmiş muayenede tedavi/reçete/aşı oluştur gizli ve neden görünür; lab ve yatış açık kalır', async () => {
        const { el } = await setup(finalizedVm, ['Examinations.Update']);

        for (const path of ['treatments', 'prescriptions', 'vaccinations']) {
            expect(el.querySelector(`a[href*="/panel/${path}/new"]`)).withContext(path).toBeNull();
        }
        expect(el.querySelector('a[href*="/panel/lab-results/new"]')).not.toBeNull();
        expect(el.querySelector('a[href*="/panel/hospitalizations/new"]')).not.toBeNull();
        expect(el.querySelector('[data-testid="finalized-locked-hint"]')?.textContent).toContain('uygulama gerekçeyle eklenebilir; ek not ekleyebilirsiniz');
    });

    it('Addendum izni olmayan kullanıcı ek notları okur ama "Ek not ekle" görmez', async () => {
        const { el } = await setup(finalizedVm, ['Examinations.Read']);

        expect(el.querySelectorAll('[data-testid="addendum-item"]').length).toBe(1);
        expect(has(el, 'addendum-open')).toBeFalse();
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
