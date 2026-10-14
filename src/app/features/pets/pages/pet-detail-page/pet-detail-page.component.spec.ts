import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { mapPetSummaryDtoToVm } from '@/app/features/pets/data/pet-summary.mapper';
import type { PetDetailVm, PetHistorySummaryVm } from '@/app/features/pets/models/pet-vm.model';
import { PetCardDataService } from '@/app/features/pets/services/pet-card-data.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { NO_PET_ALERTS } from '@/app/shared/pet-alerts/pet-alerts.utils';
import { PetDetailPageComponent } from './pet-detail-page.component';

const pet: PetDetailVm = {
    petAlerts: NO_PET_ALERTS,
    id: 'p1',
    name: 'Pamuk',
    speciesId: 's1',
    speciesName: 'Kedi',
    breed: 'Tekir',
    gender: 'female',
    birthDate: null,
    colorName: '—',
    weight: '—',
    microchipNumber: '—',
    passportOrTagNumber: '—',
    specialProtocolNumber: '—',
    isNeutered: '—',
    notes: 'Mama alerjisi var',
    ownerId: 'c1',
    clientName: 'Ali Veli',
    clientPhone: '05321234567',
    clientEmail: '—',
    status: 'Active',
    deceasedOn: null,
    rowVersion: 'AAAAAAAAB9E=',
    vaccinationsSummary: { totalCount: 0, items: [] },
    examinationsSummary: { totalCount: 0, lastExaminedAtUtc: null },
    appointmentsSummary: { totalCount: 0, upcomingCount: null }
};

const history = (omittedBlocks: PetHistorySummaryVm['omittedBlocks'] = []): PetHistorySummaryVm => ({
    petId: 'p1',
    petName: 'Pamuk',
    clientId: 'c1',
    clientName: 'Ali Veli',
    recentAppointments: [],
    recentExaminations: [],
    recentTreatments: [],
    recentPrescriptions: [],
    recentLabResults: [],
    recentHospitalizations: [],
    recentPayments: [],
    omittedBlocks
});

const summary = mapPetSummaryDtoToVm({
    petId: 'p1',
    profileWeightKg: null,
    activeHospitalization: { state: 'Empty', data: null },
    vaccinations: { state: 'Empty', data: null },
    latestWeight: { state: 'Ok', data: { weightKg: 4.4, measuredAtUtc: '2026-10-01T00:00:00Z', source: 'Examination', examinationId: 'e1' } },
    lastVisit: { state: 'Empty', data: null },
    lastExamination: { state: 'Empty', data: null }
});

describe('PetDetailPageComponent (hasta kartı)', () => {
    let fixture: ComponentFixture<PetDetailPageComponent>;
    let claims: Set<string>;
    let historyValue: PetHistorySummaryVm;
    let petValue: PetDetailVm;

    const el = () => fixture.nativeElement as HTMLElement;
    const create = () => {
        TestBed.configureTestingModule({
            imports: [PetDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'p1' })), snapshot: { queryParamMap: convertToParamMap({}) } } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c), getClinicId: () => 'k1' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                {
                    provide: PetsService,
                    useValue: {
                        getPetById: () => of(petValue),
                        getPetSummary: () => of(summary),
                        getPetHistorySummary: () => of(historyValue),
                        getPetTimeline: () => of({ items: [], nextCursor: null, omittedTypes: [] })
                    }
                },
                {
                    provide: PetCardDataService,
                    useValue: {
                        scheduledVaccinations: () =>
                            of({ state: 'ok', data: [{ id: 'v1', vaccineName: 'Karma', dueAtUtc: '2020-01-01T00:00:00Z', petId: 'p1' }] }),
                        requestedLabs: () => of(null),
                        pendingCharges: () => of(null),
                        ownerBalance: () => of(null),
                        examination: () => of(null),
                        followUpTreatments: () => of(null)
                    }
                }
            ]
        });
        fixture = TestBed.createComponent(PetDetailPageComponent);
        fixture.detectChanges();
    };

    beforeEach(() => {
        claims = new Set(['Pets.Update', 'Examinations.Create']);
        historyValue = history();
        petValue = pet;
    });

    it('vefat eden hayvanda soluk rozet ve tarih görünür; yeni bakım eylemleri yok, durum eylemi "Aktife al"', () => {
        petValue = { ...pet, status: 'Deceased', deceasedOn: '2026-10-14' };
        create();

        expect(el().querySelector('[data-testid="pet-deceased-badge"]')?.textContent).toContain('14.10.2026');
        expect(el().querySelector('a[href^="/panel/examinations/new"]')).toBeNull();
        expect(el().querySelector('[data-testid="pet-status-action"]')?.textContent).toContain('Aktife al');
    });

    it('aktif hayvanda rozet yok, "Vefat olarak işaretle" sunulur; durum yanıtı kartı ve rowVersion\'ı günceller', () => {
        create();
        expect(el().querySelector('[data-testid="pet-deceased-badge"]')).toBeNull();
        expect(el().querySelector('a[href^="/panel/examinations/new"]')).not.toBeNull();
        expect(el().querySelector('[data-testid="pet-status-action"]')?.textContent).toContain('Vefat olarak işaretle');

        fixture.componentInstance.onStatusChanged({ status: 'Deceased', deceasedOn: null, rowVersion: 'new' });
        fixture.detectChanges();

        expect(fixture.componentInstance.pet()?.rowVersion).toBe('new');
        expect(el().querySelector('[data-testid="pet-deceased-badge"]')).not.toBeNull();
        expect(el().querySelector('a[href^="/panel/examinations/new"]')).toBeNull();
    });

    it('Pets.Update yoksa durum eylemi sunulmaz', () => {
        claims = new Set(['Examinations.Create']);
        create();
        expect(el().querySelector('[data-testid="pet-status-action"]')).toBeNull();
    });

    it('başlıkta ad ve kimlik satırı (muayene kilosuyla), Düzenle, Yapılacaklar, klinik özet ve zaman çizelgesi tek sayfada', () => {
        create();

        expect(el().textContent).toContain('Pamuk');
        expect(el().textContent).toContain('Kedi · Tekir · Dişi · 4.4 kg');
        expect(el().querySelector('a[href="/panel/pets/p1/edit"]')).not.toBeNull();
        expect(el().querySelector('[data-testid="todo-overdueVaccine"]')?.textContent).toContain('Karma');
        expect(el().textContent).toContain('Klinik özet');
        expect(el().textContent).toContain('Zaman çizelgesi');
        expect(el().querySelector('[data-testid="pet-notes"]')?.textContent).toContain('Mama alerjisi');
        expect(el().textContent).not.toContain('Son randevular');
    });

    it('hekim (muayene açabilen) klinik özeti, yalnız ödeme alan resepsiyon Yapılacaklar\'ı öne alır', () => {
        create();
        expect(el().querySelector('[data-testid="clinical-column"]')?.classList).toContain('order-first');
        expect(el().querySelector('[data-testid="todo-column"]')?.classList).not.toContain('order-first');

        TestBed.resetTestingModule();
        claims = new Set(['Payments.Create']);
        create();
        expect(el().querySelector('[data-testid="todo-column"]')?.classList).toContain('order-first');
        expect(el().querySelector('[data-testid="clinical-column"]')?.classList).not.toContain('order-first');
    });

    it('geçmiş özetinde ödeme ve randevu bloğu yetkisizse zaman çizelgesi ve başlık bunu yetki olarak gösterir', () => {
        historyValue = history(['Payments', 'Appointments']);
        create();

        expect(fixture.componentInstance.payments()).toBeNull();
        expect(fixture.componentInstance.nextAppointment()).toBeNull();
        expect(el().querySelector('[data-testid="account-next-appointment"]')).toBeNull();
        expect(el().querySelector('[data-testid="omitted-note"]')?.textContent).toContain('Ödeme');
    });
});
