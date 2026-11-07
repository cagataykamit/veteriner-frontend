import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, type Confirmation } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { SpeciesService } from '@/app/entities/species/services/species.service';
import { VaccineDefinitionsService } from '@/app/entities/vaccine-definition/services/vaccine-definitions.service';
import type { VaccinationScheduleItemDto } from '@/app/entities/vaccination-schedule/models/vaccination-schedule.model';
import { VaccinationScheduleService } from '@/app/entities/vaccination-schedule/services/vaccination-schedule.service';
import { VaccinationSchedulePageComponent } from './vaccination-schedule-page.component';

const item = (over: Partial<VaccinationScheduleItemDto> = {}): VaccinationScheduleItemDto => ({
    id: 'i1',
    speciesId: 'dog',
    speciesName: 'Köpek',
    vaccineDefinitionId: 'v1',
    vaccineName: 'Karma',
    vaccineIsActive: true,
    startAgeWeeks: 6,
    doseCount: 3,
    doseIntervalWeeks: 3,
    repeatIntervalMonths: 12,
    notes: null,
    updatedAtUtc: null,
    ...over
});

describe('VaccinationSchedulePageComponent (TIER-005)', () => {
    let fixture: ComponentFixture<VaccinationSchedulePageComponent>;
    let service: Record<'getSchedule' | 'createItem' | 'updateItem' | 'deleteItem' | 'loadStarterTemplate', ReturnType<typeof vi.fn>>;
    let claims: Set<string>;
    let locked: boolean;
    let readOnly: boolean;

    const el = () => fixture.nativeElement as HTMLElement;
    const q = (id: string) => el().querySelector<HTMLElement>(`[data-testid="${id}"]`);

    async function create(): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [VaccinationSchedulePageComponent],
            providers: [
                provideRouter([]),
                { provide: VaccinationScheduleService, useValue: service },
                { provide: SpeciesService, useValue: { getSpeciesList: () => of([{ id: 'dog', code: 'DOG', name: 'Köpek', isActive: true, displayOrder: 20 }, { id: 'cat', code: 'CAT', name: 'Kedi', isActive: true, displayOrder: 10 }]) } },
                {
                    provide: VaccineDefinitionsService,
                    useValue: {
                        getVaccineDefinitions: () =>
                            of({
                                items: [
                                    { id: 'v1', speciesId: null, name: 'Karma', isActive: true },
                                    { id: 'v2', speciesId: 'cat', name: 'Lösemi', isActive: true },
                                    { id: 'v3', speciesId: null, name: 'Eski', isActive: false }
                                ]
                            })
                    }
                },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                {
                    provide: TenantReadOnlyContextService,
                    useValue: {
                        mutationBlocked: () => readOnly,
                        lockedPlanFeature: () => (locked ? { feature: 'VaccinationWizard', isEnabled: false, requiredPlanCode: 'Pro' } : null)
                    }
                }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(VaccinationSchedulePageComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(() => {
        claims = new Set(['VaccineDefinitions.Update']);
        locked = false;
        readOnly = false;
        service = {
            getSchedule: vi.fn().mockReturnValue(of({ items: [item(), item({ id: 'i2', speciesId: 'cat', speciesName: 'Kedi', vaccineName: 'Kuduz', doseCount: 1, doseIntervalWeeks: null, startAgeWeeks: 12 })] })),
            createItem: vi.fn().mockReturnValue(of(item())),
            updateItem: vi.fn().mockReturnValue(of(item())),
            deleteItem: vi.fn().mockReturnValue(of(undefined)),
            loadStarterTemplate: vi.fn().mockReturnValue(of({ addedCount: 11, schedule: { items: [item()] } }))
        };
    });

    it('satırları özetle listeler ve türe göre filtreler', async () => {
        await create();

        const rows = el().querySelectorAll('[data-testid="schedule-row"]');

        expect(rows.length).toBe(2);
        expect(rows[0].textContent).toContain('6. haftada başlar · 3 doz, 3 hafta arayla · 12 ayda bir tekrar');
        expect(rows[1].textContent).toContain('Tek doz');

        fixture.componentInstance.speciesFilter.set('cat');
        fixture.detectChanges();
        expect(el().querySelectorAll('[data-testid="schedule-row"]').length).toBe(1);
    });

    it('yeni satırda aşı listesi türe uyan aktif tanımlardır; tek dozda aralık gönderilmez', async () => {
        await create();
        const c = fixture.componentInstance;

        c.openCreate();
        c.form.patchValue({ speciesId: 'dog', vaccineDefinitionId: 'v1', startAgeWeeks: 12, doseCount: 1, doseIntervalWeeks: 4, repeatIntervalMonths: 12, notes: '  yıllık ' });
        expect(c.vaccineOptions().map((o) => o.value)).toEqual(['v1']);

        c.submit();

        expect(service.createItem).toHaveBeenCalledWith({
            speciesId: 'dog',
            vaccineDefinitionId: 'v1',
            startAgeWeeks: 12,
            doseCount: 1,
            doseIntervalWeeks: null,
            repeatIntervalMonths: 12,
            notes: 'yıllık'
        });
        expect(c.dialogVisible()).toBe(false);
    });

    it('birden fazla dozda aralık yoksa gönderilmez', async () => {
        await create();
        const c = fixture.componentInstance;

        c.openCreate();
        c.form.patchValue({ speciesId: 'dog', vaccineDefinitionId: 'v1', doseCount: 3, doseIntervalWeeks: null });
        c.submit();

        expect(service.createItem).not.toHaveBeenCalled();
        expect(c.dialogError()).toContain('doz aralığı');
    });

    it('düzenlemede tür ve aşı kilitli, sunucu hatası pencerede kalır', async () => {
        service.updateItem.mockReturnValue(throwError(() => new Error('Doz sayısı 1-5 olmalıdır.')));
        await create();
        const c = fixture.componentInstance;

        c.openEdit(item());
        expect(c.form.controls.speciesId.disabled).toBe(true);
        c.submit();

        expect(service.updateItem).toHaveBeenCalledWith('i1', expect.objectContaining({ speciesId: 'dog', doseCount: 3, doseIntervalWeeks: 3 }));
        expect(c.dialogError()).toContain('1-5');
        expect(c.dialogVisible()).toBe(true);
    });

    it('başlangıç şablonu onayla yüklenir ve eklenen sayı yazılır', async () => {
        await create();
        const confirm = fixture.debugElement.injector.get(ConfirmationService);

        vi.spyOn(confirm, 'confirm').mockImplementation((c: Confirmation) => {
            expect(c.message).toContain('Tıbbi tavsiye değildir');
            c.accept?.();

            return confirm;
        });

        q('schedule-template')!.click();
        fixture.detectChanges();

        expect(service.loadStarterTemplate).toHaveBeenCalled();
        expect(q('schedule-notice')?.textContent).toContain('11 satır eklendi');
        expect(el().querySelectorAll('[data-testid="schedule-row"]').length).toBe(1);
    });

    it('pakette yoksa üst paket kutusu çıkar, liste ve düğmeler görünmez', async () => {
        locked = true;
        await create();

        expect(q('plan-upgrade-notice')?.textContent).toContain('Otomatik aşı sihirbazı');
        expect(q('schedule-row')).toBeNull();
        expect(q('schedule-new')).toBeNull();
    });

    it('yönetim yetkisi yoksa ya da salt okunursa düğmeler görünmez', async () => {
        readOnly = true;
        await create();

        expect(q('schedule-new')).toBeNull();
        expect(q('schedule-template')).toBeNull();
        expect(el().textContent).toContain('salt okunur');
    });
});
