import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import type { ChargeSuggestionVm } from '@/app/features/charges/models/charge-suggestion-vm.model';
import type { ClientBalanceVm } from '@/app/features/clients/models/client-balance-vm.model';
import type { ClientDetailVm, ClientPaymentSummaryVm } from '@/app/features/clients/models/client-vm.model';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import type { PetListItemVm } from '@/app/features/pets/models/pet-vm.model';
import { PetCardDataService } from '@/app/features/pets/services/pet-card-data.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import type { PetCardSection } from '@/app/features/pets/utils/pet-card.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { VisitsService } from '@/app/features/visits/services/visits.service';
import { ClientDetailPageComponent } from './client-detail-page.component';

const client: ClientDetailVm = {
    id: 'c1',
    fullName: 'Ali Veli',
    phone: '05321234567',
    email: '—',
    address: '—',
    createdAtUtc: '2026-01-01T00:00:00Z',
    updatedAtUtc: null,
    preferredContactChannel: 'None',
    remindersOptedOut: false,
    kvkkConsent: { status: 'None', recordedOn: null, recordedByName: null },
    rowVersion: 'rv1'
};

const pet = (id: string, name: string, status: PetListItemVm['status'] = 'Active'): PetListItemVm => ({ id, clientId: 'c1', speciesId: 's1', name, speciesName: 'Kedi', breed: 'Tekir', colorName: '—', weight: '—', status });

const paymentSummary: ClientPaymentSummaryVm = {
    clientId: 'c1',
    clientName: 'Ali Veli',
    totalPaymentsCount: 0,
    totalPaidAmount: null,
    currencyTotals: [],
    lastPaymentAtUtc: null,
    recentPayments: []
};

const balance: ClientBalanceVm = {
    clientId: 'c1',
    clientName: 'Ali Veli',
    currency: 'TRY',
    chargedAmount: 300,
    allocatedAmount: 0,
    outstandingAmount: 300,
    openCharges: [{ chargeId: 'ch1', petId: 'p1', petName: 'Pamuk', outstandingAmount: 300 } as ClientBalanceVm['openCharges'][number]]
};

describe('ClientDetailPageComponent (müşteri kartı)', () => {
    let fixture: ComponentFixture<ClientDetailPageComponent>;
    let claims: Set<string>;
    let pets: PetCardSection<PetListItemVm[]>;
    let pendingChargesSpy: jasmine.Spy;

    const el = () => fixture.nativeElement as HTMLElement;

    const create = () => {
        TestBed.configureTestingModule({
            imports: [ClientDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'c1' })), snapshot: { queryParamMap: convertToParamMap({}) } } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c), getClinicId: () => 'k1', getUserId: () => 'u1' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                {
                    provide: ClientsService,
                    useValue: {
                        getClientById: () => of(client),
                        getClientPaymentSummary: () => of(paymentSummary),
                        getClientRecentSummary: () =>
                            of({
                                clientId: 'c1',
                                appointments: [{ id: 'a1', petId: 'p1', petName: 'Pamuk', scheduledAtUtc: '2099-01-01T09:00:00Z', status: 0, notes: null } as AppointmentListItemVm],
                                examinations: []
                            })
                    }
                },
                {
                    provide: PetCardDataService,
                    useValue: {
                        ownerBalance: () => of({ state: 'ok', data: balance }),
                        clientPets: () => of(pets),
                        clientPendingCharges: pendingChargesSpy
                    }
                },
                { provide: VisitsService, useValue: { getVeterinarians: () => ({ subscribe: () => undefined }) } },
                { provide: PetsService, useValue: {} }
            ]
        });
        fixture = TestBed.createComponent(ClientDetailPageComponent);
        fixture.detectChanges();
    };

    beforeEach(() => {
        claims = new Set(['Clients.Update', 'Examinations.Create', 'Charges.Read', 'Charges.Create', 'Visits.Create', 'Appointments.Create']);
        pets = { state: 'ok', data: [pet('p1', 'Pamuk'), pet('p2', 'Karabaş')] };
        pendingChargesSpy = jasmine
            .createSpy('clientPendingCharges')
            .and.returnValue(
                of({
                    state: 'ok',
                    data: { items: [{ id: 's1', petId: 'p2', petName: 'Karabaş', description: 'Serum', quantity: 2, suggestedUnitPrice: 50, currency: 'TRY' } as ChargeSuggestionVm], page: 1, pageSize: 200, totalItems: 1, totalPages: 1 }
                })
            );
    });

    it('tek sayfada iletişim ve hesap durumu, eylem çubuğu, para Yapılacakları, hayvanlar, ödeme özeti ve son kayıtlar; Düzenle ayrı', () => {
        create();

        expect(el().querySelector('a[href="/panel/clients/c1/edit"]')).not.toBeNull();
        expect(el().querySelector('[data-testid="patient-action-bar"]')?.textContent).toContain('Randevu al');
        expect(el().querySelector('[data-testid="client-phone"]')?.getAttribute('href')).toBe('tel:05321234567');
        expect(el().querySelector('[data-testid="account-balance"]')?.textContent).toContain('300');
        expect(el().querySelector('[data-testid="account-next-appointment"]')?.textContent).toContain('Pamuk');
        expect(el().querySelector('[data-testid="todo-pendingCharge"]')?.textContent).toContain('Karabaş: 1 işlem ücret bekliyor');
        expect(el().querySelector('[data-testid="todo-openBalance"]')).not.toBeNull();
        expect(el().querySelectorAll('[data-testid="client-pet-row"]').length).toBe(2);
        expect(el().querySelector('[data-testid="pet-outstanding"]')?.textContent).toContain('300');
        expect(el().querySelector('[data-testid="pet-pending"]')?.textContent).toContain('1 işlem');
        expect(el().textContent).toContain('Ödeme özeti');
        expect(el().textContent).toContain('Son muayeneler');
        expect(el().textContent).not.toContain('Genel bilgiler');
        expect(pendingChargesSpy).toHaveBeenCalledOnceWith('c1');
        expect(el().querySelector('[data-testid="account-pending-charges"]')?.textContent).toContain('1 işlem');
        expect(el().querySelector('[data-testid="pending-amount"]')?.textContent).toContain('100');
    });

    it('KVKK: formu yazdır herkese; rıza işaretleme Clients.Update ile, yanıt (durum + rowVersion) karta birleşir', () => {
        create();
        expect(el().querySelector('[data-testid="kvkk-print-action"]')?.getAttribute('href')).toBe('/panel/clients/c1/kvkk-form');
        expect(el().querySelector('[data-testid="kvkk-mark-action"]')).not.toBeNull();

        fixture.componentInstance.onKvkkChanged({ kvkkConsent: { status: 'Declined', recordedOn: '2026-10-01', recordedByName: 'Ayşe' }, rowVersion: 'rv2' });
        fixture.detectChanges();
        expect(fixture.componentInstance.client()?.rowVersion).toBe('rv2');
        expect(el().querySelector('[data-testid="client-kvkk-status"]')?.textContent).toContain('Ret');

        TestBed.resetTestingModule();
        claims = new Set(['Clients.Read']);
        create();
        expect(el().querySelector('[data-testid="kvkk-print-action"]')).not.toBeNull();
        expect(el().querySelector('[data-testid="kvkk-mark-action"]')).toBeNull();
    });

    it('rol vurgusu hasta kartıyla aynı: muayene açabilen hayvanları ve geçmişi, yalnız ücret/ödeme alan parayı öne alır', () => {
        create();
        expect(el().querySelector('[data-testid="pets-column"]')?.classList).toContain('order-first');
        expect(el().querySelector('[data-testid="history-column"]')?.classList).toContain('order-first');
        expect(el().querySelector('[data-testid="todo-column"]')?.classList).not.toContain('order-first');

        TestBed.resetTestingModule();
        claims = new Set(['Payments.Create', 'Charges.Read']);
        create();
        expect(el().querySelector('[data-testid="todo-column"]')?.classList).toContain('order-first');
        expect(el().querySelector('[data-testid="payments-column"]')?.classList).toContain('order-first');
        expect(el().querySelector('[data-testid="pets-column"]')?.classList).not.toContain('order-first');
    });

    it('tek aktif hayvanlı müşteride Geldi o hayvanı seçili açar; birden çok aktif hayvanda seçim diyalogda yapılır', () => {
        create();
        expect(fixture.componentInstance.arrivalPet()).toBeNull();

        TestBed.resetTestingModule();
        pets = { state: 'ok', data: [pet('p1', 'Pamuk'), pet('p2', 'Karabaş', 'Deceased')] };
        create();
        expect(fixture.componentInstance.arrivalPet()).toEqual({ id: 'p1', label: 'Pamuk — Kedi · Sahip: Ali Veli', clientId: 'c1', clientName: 'Ali Veli' });
    });

    it('hayvanlar varsayılan aktif; vefat eden "Tümü" ile rozetli görünür', () => {
        pets = { state: 'ok', data: [pet('p1', 'Pamuk'), pet('p2', 'Karabaş', 'Deceased')] };
        create();
        expect(el().querySelectorAll('[data-testid="client-pet-row"]').length).toBe(1);
        expect(el().querySelector('[data-testid="pet-deceased"]')).toBeNull();

        (el().querySelector('[data-testid="pets-filter-all"]') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(el().querySelectorAll('[data-testid="client-pet-row"]').length).toBe(2);
        expect(el().querySelector('[data-testid="pet-deceased"]')?.textContent).toContain('Vefat');
    });

    it('hayvan listesi alınamasa da ücret bekleyenler müşteri süzgeciyle okunur; ücret okunamazsa alınamadı gösterilir', () => {
        pets = { state: 'error' };
        create();
        expect(pendingChargesSpy).toHaveBeenCalledOnceWith('c1');
        expect(el().querySelector('[data-testid="pets-failed"]')).not.toBeNull();
        expect(el().querySelector('[data-testid="account-pending-charges"]')?.textContent).toContain('1 işlem');

        TestBed.resetTestingModule();
        pendingChargesSpy.and.returnValue(of({ state: 'error' }));
        create();
        expect(el().querySelector('[data-testid="account-pending-charges"]')?.textContent).toContain('alınamadı');
        expect(el().querySelector('[data-testid="todo-failed"]')?.textContent).toContain('Ücret bekleyen işlem');
    });
});
