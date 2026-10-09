import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { ExaminationDetailVm } from '@/app/features/examinations/models/examination-vm.model';
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
