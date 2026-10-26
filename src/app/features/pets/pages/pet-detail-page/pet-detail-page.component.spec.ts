import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { type Observable, of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { AppointmentsService } from '@/app/features/appointments/services/appointments.service';
import { mapPetOpenItemsDtoToVm } from '@/app/features/pets/data/pet-open-items.mapper';
import { mapPetSummaryDtoToVm } from '@/app/features/pets/data/pet-summary.mapper';
import type { PetOpenItemsDto } from '@/app/features/pets/models/pet-open-items-api.model';
import type { PetOpenItemsVm } from '@/app/features/pets/models/pet-open-items-vm.model';
import type { PetDetailVm, PetHistorySummaryVm } from '@/app/features/pets/models/pet-vm.model';
import { PetCardDataService } from '@/app/features/pets/services/pet-card-data.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import type { PetCardSection } from '@/app/features/pets/utils/pet-card.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
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
    hbsAnimalId: '—',
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

const openItems = (over: Partial<PetOpenItemsDto> = {}): PetOpenItemsVm =>
    mapPetOpenItemsDtoToVm({
        petId: 'p1',
        clientId: 'c1',
        status: 'Active',
        asOfUtc: '2026-10-14T09:00:00Z',
        vaccinations: { state: 'Ok', data: { overdue: [{ id: 'v1', vaccineName: 'Karma', dueAtUtc: '2020-01-01T00:00:00Z' }], upcoming: [] } },
        labResults: { state: 'Empty', data: null },
        pendingCharges: { state: 'Empty', data: null },
        nextAppointment: { state: 'Ok', data: { id: 'a1', scheduledAtUtc: '2030-01-01T09:00:00Z', durationMinutes: 30 } },
        outstanding: { state: 'Ok', data: { petOutstandingAmount: 400, petOpenChargeCount: 1, clientOutstandingAmount: 1250, currency: 'TRY' } },
        ...over
    });

describe('PetDetailPageComponent (hasta kartı)', () => {
    let fixture: ComponentFixture<PetDetailPageComponent>;
    let claims: Set<string>;
    let historyValue: PetHistorySummaryVm;
    let petValue: PetDetailVm;
    let openItemsSource: () => Observable<PetCardSection<PetOpenItemsVm>>;
    let openItemsCalls: number;

    const el = () => fixture.nativeElement as HTMLElement;

    const create = () => {
        TestBed.configureTestingModule({
            imports: [PetDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'p1' })), snapshot: { queryParamMap: convertToParamMap({}) } } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c), getClinicId: () => 'k1' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                { provide: AppointmentsService, useValue: { getAppointments: () => of({ items: [], page: 1, pageSize: 200, totalItems: 0, totalPages: 0 }) } },
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
                        openItems: () => {
                            openItemsCalls++;

                            return openItemsSource();
                        },
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
        openItemsSource = () => of({ state: 'ok', data: openItems() });
        openItemsCalls = 0;
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

    it("hekim (muayene açabilen) klinik özeti, yalnız ödeme alan resepsiyon Yapılacaklar'ı öne alır", () => {
        create();
        expect(el().querySelector('[data-testid="clinical-column"]')?.classList).toContain('order-first');
        expect(el().querySelector('[data-testid="todo-column"]')?.classList).not.toContain('order-first');

        TestBed.resetTestingModule();
        claims = new Set(['Payments.Create']);
        create();
        expect(el().querySelector('[data-testid="todo-column"]')?.classList).toContain('order-first');
        expect(el().querySelector('[data-testid="clinical-column"]')?.classList).not.toContain('order-first');
    });

    it('geçmiş özetinde ödeme bloğu yetkisizse zaman çizelgesi bunu yetki olarak gösterir', () => {
        historyValue = history(['Payments']);
        create();

        expect(fixture.componentInstance.payments()).toBeNull();
        expect(el().querySelector('[data-testid="omitted-note"]')?.textContent).toContain('Ödeme');
    });

    it('Yapılacaklar, başlıktaki açık borç (sahip toplamı) ve sonraki randevu tek açık işler isteğinden gelir', () => {
        create();

        expect(openItemsCalls).toBe(1);
        expect(el().querySelector('[data-testid="todo-openBalance"]')?.textContent).toContain('Bu hasta');
        expect(el().querySelector('[data-testid="account-balance"]')?.textContent).toContain('1.250');
        expect(el().querySelector('[data-testid="account-next-appointment"] a')?.getAttribute('href')).toBe('/panel/appointments/a1');
    });

    it('yetkisiz (Forbidden) bölüm satır ve başlık alanı göstermez, "yok" da demez', () => {
        openItemsSource = () => of({ state: 'ok', data: openItems({ outstanding: { state: 'Forbidden', data: null }, nextAppointment: { state: 'Forbidden', data: null } }) });
        create();

        expect(el().querySelector('[data-testid="todo-openBalance"]')).toBeNull();
        expect(el().querySelector('[data-testid="account-balance"]')).toBeNull();
        expect(el().querySelector('[data-testid="account-next-appointment"]')).toBeNull();
        expect(el().querySelector('[data-testid="todo-failed"]')).toBeNull();
    });

    it('yüklenemeyen (Unavailable) bölüm "alınamadı" notu verir; diğer satırlar ve kart yerinde kalır', () => {
        openItemsSource = () => of({ state: 'ok', data: openItems({ labResults: { state: 'Unavailable', data: null } }) });
        create();

        expect(el().querySelector('[data-testid="todo-failed"]')?.textContent).toContain('Lab');
        expect(el().querySelector('[data-testid="todo-overdueVaccine"]')).not.toBeNull();
        expect(el().textContent).toContain('Klinik özet');
    });

    it('açık işler isteği tümden başarısızsa Yapılacaklar ve başlık "alınamadı" der; kart çökmez', () => {
        openItemsSource = () => of({ state: 'error' });
        create();

        expect(el().querySelector('[data-testid="todo-failed"]')?.textContent).toContain('Aşı');
        expect(el().querySelector('[data-testid="todo-empty"]')).toBeNull();
        expect(el().querySelector('[data-testid="account-balance"]')?.textContent).toContain('alınamadı');
        expect(el().textContent).toContain('Zaman çizelgesi');
    });

    it('bütün Yapılacaklar bölümleri yetkisizse "Bekleyen iş yok" değil "yetkiniz yok" yazar', () => {
        const forbidden = { state: 'Forbidden', data: null };

        openItemsSource = () => of({ state: 'ok', data: openItems({ vaccinations: forbidden, labResults: forbidden, pendingCharges: forbidden, outstanding: forbidden }) });
        create();

        expect(el().querySelector('[data-testid="todo-empty"]')).toBeNull();
        expect(el().querySelector('[data-testid="todo-forbidden"]')?.textContent).toContain('Yapılacakları görüntülemek için yetkiniz yok.');
    });

    it('"Yeniden dene" açık işleri yeniden okur: başarıda not kalkar, hata sürerse not kalır', () => {
        openItemsSource = () => of({ state: 'error' });
        create();

        const retry = () => {
            (el().querySelector('[data-testid="todo-retry"]') as HTMLButtonElement).click();
            fixture.detectChanges();
        };

        retry();
        expect(openItemsCalls).toBe(2);
        expect(el().querySelector('[data-testid="todo-failed"]'), 'hata sürüyor').not.toBeNull();

        openItemsSource = () => of({ state: 'ok', data: openItems() });
        retry();
        expect(openItemsCalls).toBe(3);
        expect(el().querySelector('[data-testid="todo-failed"]')).toBeNull();
        expect(el().querySelector('[data-testid="todo-retry"]')).toBeNull();
        expect(el().querySelector('[data-testid="todo-overdueVaccine"]')).not.toBeNull();
    });

    it('salt okunur kiracıda da "Yeniden dene" sunulur (okuma)', () => {
        openItemsSource = () => of({ state: 'ok', data: openItems({ labResults: { state: 'Unavailable', data: null } }) });
        TestBed.overrideProvider(TenantReadOnlyContextService, { useValue: { mutationBlocked: () => true } });
        create();

        expect(el().querySelector('[data-testid="todo-retry"]')).not.toBeNull();
    });

    it('durum değişince ve randevu iptalinden sonra açık işler yeniden okunur', () => {
        create();
        fixture.componentInstance.onStatusChanged({ status: 'Deceased', deceasedOn: null, rowVersion: 'new' });
        fixture.componentInstance.reloadOpenItems();
        expect(openItemsCalls).toBe(3);
    });
});
