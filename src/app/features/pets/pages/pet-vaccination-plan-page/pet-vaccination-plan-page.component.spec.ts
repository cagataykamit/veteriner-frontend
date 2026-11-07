import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { VaccinationPlanDto } from '@/app/entities/vaccination-schedule/models/vaccination-schedule.model';
import { VaccinationScheduleService } from '@/app/entities/vaccination-schedule/services/vaccination-schedule.service';
import { PetVaccinationPlanPageComponent } from './pet-vaccination-plan-page.component';

const plan = (over: Partial<VaccinationPlanDto> = {}): VaccinationPlanDto => ({
    petId: 'p1',
    petName: 'Fındık',
    speciesId: 'dog',
    speciesName: 'Köpek',
    birthDate: '2026-09-20',
    scheduleItemCount: 2,
    suggestions: [
        { scheduleItemId: 's1', vaccineDefinitionId: 'v1', vaccineName: 'Karma', doseNumber: 1, doseCount: 3, appliedDoseCount: 0, dueDate: '2099-01-02', isLate: true },
        { scheduleItemId: 's1', vaccineDefinitionId: 'v1', vaccineName: 'Karma', doseNumber: null, doseCount: 3, appliedDoseCount: 0, dueDate: '2100-01-02', isLate: false }
    ],
    skipped: [{ scheduleItemId: 's2', vaccineDefinitionId: 'v2', vaccineName: 'Kuduz', reason: 'AlreadyScheduled', dueDate: '2099-02-01' }],
    ...over
});

describe('PetVaccinationPlanPageComponent (TIER-005)', () => {
    let fixture: ComponentFixture<PetVaccinationPlanPageComponent>;
    let service: { getPetPlan: ReturnType<typeof vi.fn>; applyPetPlan: ReturnType<typeof vi.fn> };
    let claims: Set<string>;
    let locked: boolean;

    const el = () => fixture.nativeElement as HTMLElement;
    const q = (id: string) => el().querySelector<HTMLElement>(`[data-testid="${id}"]`);

    async function create(): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [PetVaccinationPlanPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'p1' }) } } },
                { provide: VaccinationScheduleService, useValue: service },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c), getClinicId: () => 'k1' } },
                {
                    provide: TenantReadOnlyContextService,
                    useValue: {
                        mutationBlocked: () => false,
                        lockedPlanFeature: () => (locked ? { feature: 'VaccinationWizard', isEnabled: false, requiredPlanCode: 'Pro' } : null)
                    }
                }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(PetVaccinationPlanPageComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(() => {
        claims = new Set(['Vaccinations.Create', 'VaccineDefinitions.Update']);
        locked = false;
        service = {
            getPetPlan: vi.fn().mockReturnValue(of(plan())),
            applyPetPlan: vi.fn().mockReturnValue(of({ petId: 'p1', created: [{ vaccinationId: 'x', vaccineDefinitionId: 'v1', dueDate: '2099-01-02' }] }))
        };
    });

    it('önerileri seçili, gecikmeyi ve önerilmeyenleri nedeniyle gösterir', async () => {
        await create();

        expect(service.getPetPlan).toHaveBeenCalledWith('p1');
        expect(fixture.componentInstance.title()).toBe('Fındık — aşı planı');
        const rows = el().querySelectorAll('[data-testid="plan-row"]');

        expect(rows.length).toBe(2);
        expect(rows[0].textContent).toContain('1. doz / 3');
        expect(rows[1].textContent).toContain('Tekrar');
        expect(rows[0].querySelector('[data-testid="plan-row-late"]')).not.toBeNull();
        expect(q('plan-skipped')?.textContent).toContain('Kuduz — Planlı kaydı var');
        expect(q('plan-apply')?.textContent).toContain('Seçilenleri planla (2)');
    });

    it('yalnız seçilenleri değiştirilen tarihle ve doz notuyla aktif klinikte planlar', async () => {
        await create();
        const c = fixture.componentInstance;
        const [first, second] = c.rows();

        c.patch(second.key, { selected: false });
        c.patch(first.key, { dueDate: '2099-01-05' });
        c.apply();

        expect(service.applyPetPlan).toHaveBeenCalledWith('p1', 'k1', [{ vaccineDefinitionId: 'v1', dueDate: '2099-01-05', notes: 'Aşı takviminden: 1. doz / 3' }]);
        expect(c.applied()).toBe(1);
        expect(service.getPetPlan).toHaveBeenCalledTimes(2);
    });

    it('geçmiş tarih seçilirse onay kapalı', async () => {
        await create();
        const c = fixture.componentInstance;

        c.patch(c.rows()[0].key, { dueDate: '2000-01-01' });

        expect(c.hasInvalidDate()).toBe(true);
        c.apply();
        expect(service.applyPetPlan).not.toHaveBeenCalled();
    });

    it('sunucu hatası yazılır, seçim kaybolmaz', async () => {
        service.applyPetPlan.mockReturnValue(throwError(() => new Error('Bu aşı o gün için zaten planlı; planı yenileyip tekrar deneyin.')));
        await create();
        const c = fixture.componentInstance;

        c.apply();

        expect(c.saveError()).toContain('zaten planlı');
        expect(c.rows().filter((r) => r.selected).length).toBe(2);
    });

    it('türün takvimi yoksa takvime yönlendirir', async () => {
        service.getPetPlan.mockReturnValue(of(plan({ scheduleItemCount: 0, suggestions: [], skipped: [] })));
        await create();

        expect(el().textContent).toContain('Köpek için aşı takvimi tanımlı değil.');
        expect(q('plan-schedule-link')).not.toBeNull();
        expect(q('plan-apply')).toBeNull();
    });

    it('aşı kaydı oluşturma yetkisi yoksa onay düğmesi yerine neden yazılır', async () => {
        claims = new Set();
        await create();

        expect(q('plan-apply')).toBeNull();
        expect(el().textContent).toContain('aşı kaydı oluşturma yetkisi');
    });

    it('pakette yoksa üst paket kutusu çıkar, öneri istenmez', async () => {
        locked = true;
        await create();

        expect(q('plan-upgrade-notice')).not.toBeNull();
        expect(service.getPetPlan).not.toHaveBeenCalled();
    });
});
