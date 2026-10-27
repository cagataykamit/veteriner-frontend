import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { PetNextAppointmentVm } from '@/app/entities/pet/models/pet-open-items-vm.model';
import type { PetDetailVm } from '@/app/entities/pet/models/pet-vm.model';
import type { PetCardSection } from '@/app/features/pets/utils/pet-card.utils';
import { PetCardHeaderComponent } from './pet-card-header.component';

const pet = {
    id: 'p1',
    name: 'Pamuk',
    ownerId: 'c1',
    clientName: 'Ali Veli',
    clientPhone: '05321234567',
    petAlerts: { flags: ['Bites'], note: 'Muayenede ağızlık' }
} as unknown as PetDetailVm;

describe('PetCardHeaderComponent', () => {
    const render = (inputs: { balance?: PetCardSection<{ outstandingAmount: number; currency: string }>; nextAppointment?: PetCardSection<PetNextAppointmentVm | null>; pet?: PetDetailVm }) => {
        TestBed.configureTestingModule({ imports: [PetCardHeaderComponent], providers: [provideRouter([])] });
        const fixture = TestBed.createComponent(PetCardHeaderComponent);

        fixture.componentRef.setInput('pet', inputs.pet ?? pet);
        fixture.componentRef.setInput('balance', inputs.balance ?? null);
        fixture.componentRef.setInput('nextAppointment', inputs.nextAppointment ?? null);
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    };

    it('sahip bağlantısı, aranabilir telefon, uyarı notu ve açık borç gösterilir', () => {
        const el = render({ balance: { state: 'ok', data: { outstandingAmount: 1250, currency: 'TRY' } } });

        expect(el.querySelector('a[href="/panel/clients/c1"]')?.textContent).toContain('Ali Veli');
        expect(el.querySelector('[data-testid="owner-phone"]')?.getAttribute('href')).toBe('tel:05321234567');
        expect(el.querySelector('[data-testid="owner-phone"]')?.textContent).toContain('+90 532 123 45 67');
        expect(el.querySelector('[data-testid="alert-note"]')?.textContent).toContain('ağızlık');
        expect(el.querySelector('[data-testid="account-balance"]')?.textContent).toContain('1.250');
    });

    it('yetki yoksa borç ve randevu alanı hiç gösterilmez; borç yoksa "Yok"; randevu yoksa "Yok"', () => {
        let el = render({});

        expect(el.querySelector('[data-testid="account-balance"]')).toBeNull();
        expect(el.querySelector('[data-testid="account-next-appointment"]')).toBeNull();
        expect(el.querySelector('[data-testid="account-last-visit"]')).not.toBeNull();
        TestBed.resetTestingModule();

        el = render({ balance: { state: 'ok', data: { outstandingAmount: 0, currency: 'TRY' } }, nextAppointment: { state: 'ok', data: null } });
        expect(el.querySelector('[data-testid="account-balance"]')?.textContent).toContain('Yok');
        expect(el.querySelector('[data-testid="account-next-appointment"]')?.textContent).toContain('Yok');
    });

    it('telefon yoksa arama bağlantısı çıkmaz', () => {
        const el = render({ pet: { ...pet, clientPhone: '—' } as PetDetailVm });

        expect(el.querySelector('[data-testid="owner-phone"]')).toBeNull();
    });
});
