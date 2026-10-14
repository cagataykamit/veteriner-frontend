import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { EMPTY, Observable, of, throwError } from 'rxjs';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import { AppointmentsService } from '@/app/features/appointments/services/appointments.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { DetailRelatedSummariesService } from '@/app/shared/panel/detail-related-summaries.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import type { VisitVm } from '@/app/features/visits/models/visit-vm.model';
import { VisitsService } from '@/app/features/visits/services/visits.service';
import { ExaminationWorkspacePageComponent } from './examination-workspace-page.component';

const visit = (over: Partial<VisitVm> = {}): VisitVm => ({
    id: 'visit-1',
    clinicId: 'clinic-1',
    petId: 'pet-1',
    appointmentId: null,
    responsibleVeterinarianUserId: null,
    responsibleVeterinarianName: null,
    arrivedAtUtc: '2026-10-10T07:00:00Z',
    careStatus: 'Waiting',
    isVoided: false,
    isUrgent: false,
    ...over
});

describe('ExaminationWorkspacePageComponent (Bugün / Visit bağlamı)', () => {
    let examinations: jasmine.SpyObj<ExaminationsService>;
    let visits: jasmine.SpyObj<VisitsService>;
    let navigate: jasmine.Spy;

    const create = (query: Record<string, string>, visitResult: Observable<VisitVm>) => {
        examinations = jasmine.createSpyObj<ExaminationsService>('ExaminationsService', ['createExamination']);
        visits = jasmine.createSpyObj<VisitsService>('VisitsService', ['getVisitById']);
        visits.getVisitById.and.returnValue(visitResult);

        TestBed.configureTestingModule({
            imports: [ExaminationWorkspacePageComponent],
            providers: [
                provideRouter([]),
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
                { provide: ExaminationsService, useValue: examinations },
                { provide: VisitsService, useValue: visits },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: { paramMap: convertToParamMap({}), queryParamMap: convertToParamMap(query), routeConfig: { path: 'new' } }
                    }
                },
                { provide: AuthService, useValue: { getClinicName: () => 'Klinik', getClinicId: () => 'clinic-1', hasOperationClaim: () => true } },
                { provide: AppointmentsService, useValue: {} },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                { provide: PetsService, useValue: { getPetById: () => of({ name: 'Pamuk', speciesName: 'Kedi', breed: 'Van', birthDate: null }), getPetSummary: () => EMPTY } },
                { provide: DetailRelatedSummariesService, useValue: { loadSiblingExaminationsForPet: () => of([]) } },
                { provide: ClientsService, useValue: { getClientById: () => of({ fullName: 'Ali Veli', phone: '555', email: '—' }) } }
            ]
        });
        navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        const fixture = TestBed.createComponent(ExaminationWorkspacePageComponent);
        fixture.detectChanges();
        return fixture.componentInstance;
    };

    const ctxQuery = { visitId: 'visit-1', clientId: 'client-1', petId: 'pet-1' };

    it('açık Visit doğrulanır: hasta seçimi istenmez, müşteri seçimi kilitli, yalnızca visitId ile kaydedilir', () => {
        const cmp = create(ctxQuery, of(visit()));
        examinations.createExamination.and.returnValue(of({ id: 'e1', rowVersion: 'A' }));

        expect(cmp.visitContextId()).toBe('visit-1');
        expect(cmp.selectedPetId()).toBe('pet-1');
        expect(cmp.selectionForm.controls.clientId.disabled).toBeTrue();
        expect(cmp.selectionForm.invalid).toBeFalse();

        cmp.form.patchValue({ examinationDate: '2026-10-10', examinationTime: '13:30', visitReason: 'Kontrol' });
        cmp.onSubmit();

        expect(examinations.createExamination).toHaveBeenCalledTimes(1);
        const payload = examinations.createExamination.calls.mostRecent().args[0];
        expect(payload.visitId).toBe('visit-1');
        expect(payload.petId).toBeUndefined();
        expect(payload.clinicId).toBeUndefined();
        expect(payload.appointmentId).toBeUndefined();
        expect(navigate).toHaveBeenCalledWith(['/panel/examinations', 'e1'], { queryParams: { saved: '1' } });
    });

    it('tamamlanmış Visit reddedilir; mesaj gösterilir ve serbest oluşturma formu açılır', () => {
        const cmp = create(ctxQuery, of(visit({ careStatus: 'Completed' })));

        expect(cmp.visitContextId()).toBeNull();
        expect(cmp.selectionError()).toContain('muayene açılamaz');
        expect(cmp.selectionForm.controls.clientId.enabled).toBeTrue();
    });

    it('yanlış geliş işaretli Visit reddedilir', () => {
        const cmp = create(ctxQuery, of(visit({ isVoided: true })));
        expect(cmp.visitContextId()).toBeNull();
    });

    it('adresteki hayvan Visit in hayvanıyla uyuşmuyorsa reddedilir', () => {
        const cmp = create(ctxQuery, of(visit({ petId: 'baska-hayvan' })));

        expect(cmp.visitContextId()).toBeNull();
        expect(cmp.selectionError()).toContain('uyuşmuyor');
    });

    it('Visit yüklenemezse sunucu mesajı gösterilir', () => {
        const cmp = create(ctxQuery, throwError(() => new Error('Geliş kaydı bulunamadı veya artık kuyrukta değil. Listeyi yenileyin.')));

        expect(cmp.visitContextId()).toBeNull();
        expect(cmp.selectionError()).toContain('Geliş kaydı bulunamadı');
    });

    it('visitId yoksa mevcut serbest akış değişmez', () => {
        const cmp = create({}, of(visit()));

        expect(visits.getVisitById).not.toHaveBeenCalled();
        expect(cmp.visitContextId()).toBeNull();
        expect(cmp.selectionForm.controls.clientId.enabled).toBeTrue();
    });
});
