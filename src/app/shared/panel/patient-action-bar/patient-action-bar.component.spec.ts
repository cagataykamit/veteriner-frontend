import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { VisitsService } from '@/app/features/visits/services/visits.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { PatientActionBarComponent } from './patient-action-bar.component';

describe('PatientActionBarComponent', () => {
    let claims: Set<string>;
    let mutationBlocked: boolean;

    const create = (inputs: Record<string, string | null>) => {
        TestBed.configureTestingModule({
            imports: [PatientActionBarComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c), getClinicId: () => 'c1', getUserId: () => 'u1' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } },
                { provide: VisitsService, useValue: { getVeterinarians: () => ({ subscribe: () => undefined }) } },
                { provide: ClientsService, useValue: {} },
                { provide: PetsService, useValue: {} }
            ]
        });
        const fixture = TestBed.createComponent(PatientActionBarComponent);
        for (const [k, v] of Object.entries(inputs)) {
            fixture.componentRef.setInput(k, v);
        }
        fixture.detectChanges();
        return fixture;
    };

    beforeEach(() => {
        claims = new Set(['Examinations.Create', 'Appointments.Create', 'Payments.Create', 'Pets.Create']);
        mutationBlocked = false;
    });

    it('hayvan bağlamıyla eylem bağlantıları müşteri ve hayvanı sorgu parametresi olarak taşır', () => {
        const el: HTMLElement = create({ clientId: 'cl1', petId: 'p1', petLabel: 'Pamuk — Kedi', clientName: 'Ali Veli' }).nativeElement;
        const exam = el.querySelector('a[href^="/panel/examinations/new"]') as HTMLAnchorElement;
        expect(exam.textContent).toContain('Muayene başlat');
        expect(exam.getAttribute('href')).toContain('clientId=cl1');
        expect(exam.getAttribute('href')).toContain('petId=p1');
        expect(el.textContent).not.toContain('Yeni hayvan');
    });

    it('müşteri sayfasında Yeni hayvan müşteri bağlamıyla görünür', () => {
        const el: HTMLElement = create({ clientId: 'cl1' }).nativeElement;
        const link = el.querySelector('a[href^="/panel/pets/new"]') as HTMLAnchorElement;
        expect(link.textContent).toContain('Yeni hayvan');
        expect(link.getAttribute('href')).toContain('clientId=cl1');
        expect(el.textContent).not.toContain('Muayene başlat');
    });

    it('Visits.Create varsa Geldi düğmesi gösterilir; yoksa gösterilmez', () => {
        claims.add('Visits.Create');
        let el: HTMLElement = create({ clientId: 'cl1', petId: 'p1', petLabel: 'Pamuk — Kedi', clientName: 'Ali Veli' }).nativeElement;
        expect(Array.from(el.querySelectorAll('button')).some((b) => b.textContent?.includes('Geldi'))).toBeTrue();
        TestBed.resetTestingModule();
        claims.delete('Visits.Create');
        el = create({ clientId: 'cl1', petId: 'p1' }).nativeElement;
        expect(el.textContent).not.toContain('Geldi');
    });

    it('müşteri sayfasında Geldi diyaloğu açılır; tek hayvan verilirse önceden seçilir, Randevu al yalnız müşteriyi taşır', () => {
        claims.add('Visits.Create');
        const fixture = create({ clientId: 'cl1' });
        const el: HTMLElement = fixture.nativeElement;
        expect(Array.from(el.querySelectorAll('button')).some((b) => b.textContent?.includes('Geldi'))).toBeTrue();
        const appt = el.querySelector('a[href^="/panel/appointments/new"]') as HTMLAnchorElement;
        expect(appt.getAttribute('href')).toBe('/panel/appointments/new?clientId=cl1');
        expect(fixture.componentInstance.petSuggestion()).toBeNull();

        const pet = { id: 'p1', label: 'Pamuk — Kedi · Sahip: Ali Veli', clientId: 'cl1', clientName: 'Ali Veli' };
        fixture.componentRef.setInput('arrivalPet', pet);
        expect(fixture.componentInstance.petSuggestion()).toEqual(pet);
    });

    it('hiç yetki yoksa çubuk görünmez; salt okunur kiracıda eylemler yerine bilgi gösterilir', () => {
        claims = new Set();
        let el: HTMLElement = create({ clientId: 'cl1', petId: 'p1' }).nativeElement;
        expect(el.querySelector('[role="toolbar"]')).toBeNull();
        TestBed.resetTestingModule();
        claims = new Set(['Examinations.Create']);
        mutationBlocked = true;
        el = create({ clientId: 'cl1', petId: 'p1' }).nativeElement;
        expect(el.textContent).toContain('salt okunur');
        expect(el.querySelector('a[href^="/panel/examinations/new"]')).toBeNull();
    });

    it('sticky açıkken çubuk üst çubuğun altında sabitlenir; varsayılan sabit değildir', () => {
        const fixture = create({ clientId: 'cl1', petId: 'p1' });
        const bar = () => fixture.nativeElement.querySelector('[data-testid="patient-action-bar"]') as HTMLElement;
        expect(bar().classList).not.toContain('sticky');
        expect(bar().classList).toContain('card');

        fixture.componentRef.setInput('sticky', true);
        fixture.detectChanges();

        expect(bar().classList).toContain('sticky');
        expect(bar().classList).toContain('top-16');
        expect(bar().classList).toContain('card');
    });
});
