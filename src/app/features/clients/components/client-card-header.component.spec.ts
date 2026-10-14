import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import type { ChargeSuggestionsPagedVm, ChargeSuggestionVm } from '@/app/features/charges/models/charge-suggestion-vm.model';
import type { ClientBalanceVm } from '@/app/features/clients/models/client-balance-vm.model';
import type { ClientDetailVm } from '@/app/features/clients/models/client-vm.model';
import type { ExaminationListItemVm } from '@/app/features/examinations/models/examination-vm.model';
import type { PetCardSection } from '@/app/features/pets/utils/pet-card.utils';
import { ClientCardHeaderComponent } from './client-card-header.component';

const client: ClientDetailVm = {
    id: 'c1',
    fullName: 'Ali Veli',
    phone: '05321234567',
    email: 'ali@example.com',
    address: 'Kadıköy, İstanbul',
    createdAtUtc: '2026-01-01T00:00:00Z',
    updatedAtUtc: null
};

const pending = (items: Partial<ChargeSuggestionVm>[], totalItems = items.length): ChargeSuggestionsPagedVm => ({
    items: items as ChargeSuggestionVm[],
    page: 1,
    pageSize: 200,
    totalItems,
    totalPages: 1
});

describe('ClientCardHeaderComponent', () => {
    const render = (inputs: {
        client?: ClientDetailVm;
        balance?: PetCardSection<ClientBalanceVm>;
        pendingCharges?: PetCardSection<ChargeSuggestionsPagedVm>;
        lastExamination?: PetCardSection<ExaminationListItemVm | null>;
        nextAppointment?: PetCardSection<AppointmentListItemVm | null>;
    }) => {
        TestBed.configureTestingModule({ imports: [ClientCardHeaderComponent], providers: [provideRouter([])] });
        const fixture = TestBed.createComponent(ClientCardHeaderComponent);
        fixture.componentRef.setInput('client', inputs.client ?? client);
        fixture.componentRef.setInput('balance', inputs.balance ?? null);
        fixture.componentRef.setInput('pendingCharges', inputs.pendingCharges ?? null);
        fixture.componentRef.setInput('lastExamination', inputs.lastExamination ?? null);
        fixture.componentRef.setInput('nextAppointment', inputs.nextAppointment ?? null);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    };

    it('iletişim: aranabilir telefon, e-posta bağlantısı ve adres; hesap durumu: borç, ücret bekleyen, son muayene, sonraki randevu', () => {
        const el = render({
            balance: { state: 'ok', data: { outstandingAmount: 1250, currency: 'TRY' } as ClientBalanceVm },
            pendingCharges: { state: 'ok', data: pending([{ id: 'x', quantity: 2, suggestedUnitPrice: 100, currency: 'TRY' }, { id: 'y', quantity: 1, suggestedUnitPrice: null, currency: 'TRY' }]) },
            lastExamination: { state: 'ok', data: { id: 'e1', examinedAtUtc: '2026-10-10T08:00:00Z', petName: 'Pamuk' } as ExaminationListItemVm },
            nextAppointment: { state: 'ok', data: { id: 'a1', scheduledAtUtc: '2026-10-20T08:00:00Z', petName: 'Karabaş' } as AppointmentListItemVm }
        });

        expect(el.querySelector('[data-testid="client-phone"]')?.getAttribute('href')).toBe('tel:05321234567');
        expect(el.querySelector('[data-testid="client-phone"]')?.textContent).toContain('+90 532 123 45 67');
        expect(el.querySelector('[data-testid="client-email"]')?.getAttribute('href')).toBe('mailto:ali@example.com');
        expect(el.querySelector('[data-testid="client-address"]')?.textContent).toContain('Kadıköy');
        expect(el.querySelector('[data-testid="account-balance"]')?.textContent).toContain('1.250');
        expect(el.querySelector('[data-testid="account-pending-charges"]')?.textContent).toContain('2 işlem');
        expect(el.querySelector('[data-testid="pending-amount"]')?.textContent).toContain('200');
        expect(el.querySelector('[data-testid="pending-unpriced"]')?.textContent).toContain('1 kalem fiyat bekliyor');
        expect(el.querySelector('[data-testid="account-last-examination"] a')?.getAttribute('href')).toBe('/panel/examinations/e1');
        expect(el.querySelector('[data-testid="account-last-examination"]')?.textContent).toContain('Pamuk');
        expect(el.querySelector('[data-testid="account-next-appointment"]')?.textContent).toContain('Karabaş');
    });

    it('sayfa tüm kalemleri içermiyorsa sayı totalItems, tutar "en az" ile gösterilir', () => {
        const el = render({ pendingCharges: { state: 'ok', data: pending([{ id: 'x', quantity: 1, suggestedUnitPrice: 40, currency: 'TRY' }], 250) } });
        expect(el.querySelector('[data-testid="account-pending-charges"]')?.textContent).toContain('250 işlem');
        expect(el.querySelector('[data-testid="pending-amount"]')?.textContent).toContain('en az');
    });

    it('telefon/e-posta/adres boşsa bağlantı çıkmaz; yetkisiz alanlar gösterilmez, kayıt yoksa "Yok", hata "alınamadı"', () => {
        const el = render({
            client: { ...client, phone: '—', email: '—', address: '—' },
            pendingCharges: { state: 'error' },
            lastExamination: { state: 'ok', data: null }
        });

        expect(el.querySelector('[data-testid="client-phone"]')).toBeNull();
        expect(el.querySelector('[data-testid="client-phone-missing"]')).not.toBeNull();
        expect(el.querySelector('[data-testid="client-email"]')).toBeNull();
        expect(el.querySelector('[data-testid="client-address"]')).toBeNull();
        expect(el.querySelector('[data-testid="account-balance"]')).toBeNull();
        expect(el.querySelector('[data-testid="account-next-appointment"]')).toBeNull();
        expect(el.querySelector('[data-testid="account-pending-charges"]')?.textContent).toContain('alınamadı');
        expect(el.querySelector('[data-testid="account-last-examination"]')?.textContent).toContain('Yok');
    });
});
