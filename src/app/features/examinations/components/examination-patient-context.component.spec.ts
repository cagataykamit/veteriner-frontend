import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { PetSummaryVm } from '@/app/features/pets/models/pet-summary-vm.model';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { TreatmentsService } from '@/app/features/treatments/services/treatments.service';
import { VaccinationsService } from '@/app/features/vaccinations/services/vaccinations.service';
import { DetailRelatedSummariesService } from '@/app/features/patients/services/detail-related-summaries.service';
import { NO_PET_ALERTS } from '@/app/shared/pet-alerts/pet-alerts.utils';
import { ExaminationPatientContextComponent } from './examination-patient-context.component';

const ALL_CLAIMS = ['Vaccinations.Read', 'Treatments.Read', 'Examinations.Read'];

const summaryVm: PetSummaryVm = {
    petId: 'pet-1',
    petAlerts: NO_PET_ALERTS,
    profileWeightKg: 4.2,
    activeHospitalization: {
        state: 'Ok',
        data: { id: 'h1', clinicName: null, admittedAtUtc: '2026-10-13T08:00:00Z', plannedDischargeAtUtc: null, reason: 'Sıvı tedavisi', examinationId: null }
    },
    vaccinations: { state: 'Empty', data: null },
    latestWeight: { state: 'Ok', data: { weightKg: 4.4, measuredAtUtc: '2026-10-10T08:00:00Z', examinationId: 'e0' } },
    lastVisit: { state: 'Empty', data: null },
    lastExamination: { state: 'Empty', data: null }
};

const future = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();

describe('ExaminationPatientContextComponent', () => {
    const setup = async (opts: { claims?: string[]; summaryFails?: boolean } = {}) => {
        const pets = { getPetSummary: jasmine.createSpy('getPetSummary').and.returnValue(opts.summaryFails ? throwError(() => new Error('x')) : of(summaryVm)) };
        const vaccinations = {
            getVaccinations: jasmine.createSpy('getVaccinations').and.returnValue(
                of({
                    items: [{ id: 'v1', vaccineName: 'Kuduz', dueAtUtc: '2026-09-01T00:00:00Z' }],
                    page: 1,
                    pageSize: 3,
                    totalItems: 4,
                    totalPages: 2
                })
            )
        };
        const treatments = {
            getTreatments: jasmine.createSpy('getTreatments').and.returnValue(
                of({
                    items: [
                        { id: 't1', title: 'Antibiyotik', followUpDateUtc: future },
                        { id: 't3', title: 'Kontrol', followUpDateUtc: future }
                    ],
                    page: 1,
                    pageSize: 20,
                    totalItems: 2,
                    totalPages: 1
                })
            )
        };
        const related = {
            loadSiblingExaminationsForPet: jasmine
                .createSpy('loadSiblingExaminationsForPet')
                .and.returnValue(of([{ id: 'e0', examinedAtUtc: '2026-10-10T08:00:00Z', visitReason: 'Kusma' }]))
        };
        const claims = opts.claims ?? ALL_CLAIMS;

        await TestBed.configureTestingModule({
            imports: [ExaminationPatientContextComponent],
            providers: [
                provideRouter([]),
                { provide: PetsService, useValue: pets },
                { provide: VaccinationsService, useValue: vaccinations },
                { provide: TreatmentsService, useValue: treatments },
                { provide: DetailRelatedSummariesService, useValue: related },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c) } }
            ]
        }).compileComponents();
        const fixture = TestBed.createComponent(ExaminationPatientContextComponent);

        fixture.componentRef.setInput('petId', 'pet-1');
        fixture.componentRef.setInput('excludeExaminationId', 'e1');
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        const text = (id: string) => el.querySelector(`[data-testid="${id}"]`)?.textContent ?? '';

        return { fixture, el, text, vaccinations, treatments, related };
    };

    it('kilo, gecikmiş aşı, aktif tedavi/yatış ve son muayeneleri tek panelde gösterir', async () => {
        const { el, text, vaccinations, treatments: treatmentsService, related } = await setup();

        expect(text('ctx-weight')).toContain('4.4 kg');
        expect(vaccinations.getVaccinations).toHaveBeenCalledWith(jasmine.objectContaining({ petId: 'pet-1', onlyOverdue: true }));
        expect(el.querySelectorAll('[data-testid="ctx-overdue-item"]').length).toBe(1);
        expect(text('ctx-overdue')).toContain('+3 daha');
        expect(text('ctx-hospitalization')).toContain('Sıvı tedavisi');
        const treatments = Array.from(el.querySelectorAll('[data-testid="ctx-treatment"]')).map((a) => a.textContent ?? '');

        // Aktif tedavi kuralı (ADR-025) sunucudadır: istemci `active=true` ister ve dönen satırları süzmeden gösterir.
        expect(treatmentsService.getTreatments).toHaveBeenCalledWith(jasmine.objectContaining({ petId: 'pet-1', active: true }));
        expect(treatments.length).toBe(2);
        expect(treatments[0]).toContain('Antibiyotik');
        expect(related.loadSiblingExaminationsForPet).toHaveBeenCalledWith('pet-1', 'e1');
        expect(text('ctx-recent-exams')).toContain('Kusma');
    });

    it('okuma izni olmayan bölüm çizilmez ve ucu çağrılmaz', async () => {
        const { el, vaccinations } = await setup({ claims: ['Examinations.Read'] });

        expect(el.querySelector('[data-testid="ctx-overdue"]')).toBeNull();
        expect(vaccinations.getVaccinations).not.toHaveBeenCalled();
        expect(el.querySelector('[data-testid="ctx-treatment"]')).toBeNull();
    });

    it('özet alınamazsa kilo "Alınamadı" der; diğer bölümler yine görünür', async () => {
        const { el, text } = await setup({ summaryFails: true });

        expect(text('ctx-weight')).toContain('Alınamadı');
        expect(el.querySelectorAll('[data-testid="ctx-overdue-item"]').length).toBe(1);
        expect(text('ctx-recent-exams')).toContain('Kusma');
    });

    it('dar ekran için gövde başlıktan açılıp kapanır (varsayılan kapalı)', async () => {
        const { fixture, el } = await setup();
        const body = () => el.querySelector('[data-testid="patient-context-body"]')!;
        const toggle = el.querySelector('[data-testid="patient-context-toggle"]') as HTMLButtonElement;

        expect(body().classList).toContain('hidden');
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        toggle.click();
        fixture.detectChanges();
        expect(body().classList).not.toContain('hidden');
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
    });
});
