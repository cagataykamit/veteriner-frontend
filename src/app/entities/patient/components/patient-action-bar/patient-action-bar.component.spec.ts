import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import { PetsService } from '@/app/entities/pet/services/pets.service';
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
        expect(el.textContent).not.toContain('Yeni hasta');
    });

    it('müşteri sayfasında Yeni hayvan müşteri bağlamıyla görünür', () => {
        const el: HTMLElement = create({ clientId: 'cl1' }).nativeElement;
        const link = el.querySelector('a[href^="/panel/pets/new"]') as HTMLAnchorElement;

        expect(link.textContent).toContain('Yeni hasta');
        expect(link.getAttribute('href')).toContain('clientId=cl1');
        expect(el.textContent).not.toContain('Muayene başlat');
    });

    it('Visits.Create varsa Geldi düğmesi gösterilir; yoksa gösterilmez', () => {
        claims.add('Visits.Create');
        const first = create({ clientId: 'cl1', petId: 'p1', petLabel: 'Pamuk — Kedi', clientName: 'Ali Veli' });
        let el: HTMLElement = first.nativeElement;

        // Hekimde Geldi "Geliş ve randevu" menüsünde.
        expect(first.componentInstance.actions().map((a) => a.key)).toContain('arrive');
        expect(el.querySelector('app-visit-arrival-dialog')).not.toBeNull();
        TestBed.resetTestingModule();
        claims.delete('Visits.Create');
        el = create({ clientId: 'cl1', petId: 'p1' }).nativeElement;
        expect(el.textContent).not.toContain('Geldi');
    });

    it('müşteri sayfasında Geldi diyaloğu açılır; tek hayvan verilirse önceden seçilir, Randevu al yalnız müşteriyi taşır', () => {
        claims.add('Visits.Create');
        const fixture = create({ clientId: 'cl1' });
        const el: HTMLElement = fixture.nativeElement;

        expect(Array.from(el.querySelectorAll('button')).some((b) => b.textContent?.includes('Geldi'))).toBe(true);
        const appt = el.querySelector('a[href^="/panel/appointments/new"]') as HTMLAnchorElement;

        expect(appt.getAttribute('href')).toBe('/panel/appointments/new?clientId=cl1');
        expect(fixture.componentInstance.petSuggestion()).toBeNull();

        const pet = { id: 'p1', label: 'Pamuk — Kedi · Sahip: Ali Veli', clientId: 'cl1', clientName: 'Ali Veli' };

        fixture.componentRef.setInput('arrivalPet', pet);
        expect(fixture.componentInstance.petSuggestion()).toEqual(pet);
    });

    it('hiç yetki yoksa çubuk görünmez; salt okunur kiracıda eylemler kilitli kalır ve bilgi gösterilir', () => {
        claims = new Set();
        let el: HTMLElement = create({ clientId: 'cl1', petId: 'p1' }).nativeElement;

        expect(el.querySelector('[role="toolbar"]')).toBeNull();
        TestBed.resetTestingModule();
        claims = new Set(['Examinations.Create']);
        mutationBlocked = true;
        el = create({ clientId: 'cl1', petId: 'p1' }).nativeElement;
        expect(el.textContent).toContain('salt okunur');
        expect(el.querySelector('a[href^="/panel/examinations/new"]')).toBeNull();
        const locked = el.querySelector('[role="toolbar"] button') as HTMLButtonElement;

        expect(locked.textContent).toContain('Muayene başlat');
        expect(locked.disabled).toBe(true);
    });

    it('hasta kartında hekim: Klinik grubu açık düğmeler, Geliş ve randevu ile Para grup adlı menü; telefonda birincil + Diğer (M-02)', () => {
        claims.add('Visits.Create');
        const fixture = create({ clientId: 'cl1', petId: 'p1' });
        const el: HTMLElement = fixture.nativeElement;
        const clinic = el.querySelector('[data-testid="patient-action-group-clinic"]')!;

        expect(clinic.querySelector('a[href^="/panel/examinations/new"]')?.classList).toContain('p-button-primary');
        expect(el.querySelector('[data-testid="patient-action-group-visit"] a')).toBeNull();
        expect(el.querySelector('[data-testid="patient-action-menu-visit"]')?.textContent).toContain('Geliş ve randevu');
        expect(el.querySelector('[data-testid="patient-action-menu-money"]')?.textContent).toContain('Para');
        expect(el.querySelector('[data-testid="patient-action-phone"]')?.textContent).toContain('Muayene başlat');
        expect(fixture.componentInstance.phoneMenuItems().map((g) => [g.label, g.items!.map((i) => i.label)])).toEqual([
            ['Geliş ve randevu', ['Geldi', 'Randevu al']],
            ['Para', ['Ödeme al']]
        ]);
    });

    it('hasta kartında ön büro (muayene yetkisi yok): Geliş ve randevu ile Para açık, birincil Geldi; klinikteyse Bugün\'de aç', () => {
        claims = new Set(['Visits.Create', 'Visits.Read', 'Appointments.Create', 'Payments.Create', 'Vaccinations.Create']);
        let fixture = create({ clientId: 'cl1', petId: 'p1' });
        let el: HTMLElement = fixture.nativeElement;
        const primary = el.querySelector('[data-testid="patient-action-group-visit"] .p-button-primary');

        expect(primary?.textContent).toContain('Geldi');
        expect(el.querySelector('[data-testid="patient-action-group-money"] a[href^="/panel/payments/new"]')).not.toBeNull();
        expect(el.querySelector('[data-testid="patient-action-menu-clinic"]')?.textContent).toContain('Klinik');

        TestBed.resetTestingModule();
        fixture = create({ clientId: 'cl1', petId: 'p1' });
        fixture.componentRef.setInput('openVisit', { visitId: 'vis1', waiting: true });
        fixture.detectChanges();
        el = fixture.nativeElement;
        const today = el.querySelector('[data-testid="patient-action-group-visit"] a.p-button-primary') as HTMLAnchorElement;

        expect(today.textContent).toContain("Bugün'de aç");
        expect(today.getAttribute('href')).toBe('/panel/today');
        expect(el.textContent).not.toContain('Geldi');
    });

    it('sticky açıkken çubuk (telefon dışında) üst çubuğun altında sabitlenir; varsayılan sabit değildir; şerit kart değildir', () => {
        const fixture = create({ clientId: 'cl1', petId: 'p1' });
        const bar = () => fixture.nativeElement.querySelector('[data-testid="patient-action-bar"]') as HTMLElement;

        expect(bar().classList).not.toContain('sm:sticky');
        expect(bar().classList).not.toContain('card');

        fixture.componentRef.setInput('sticky', true);
        fixture.detectChanges();

        // Telefonda satır kıran şerit ekranı kaplamasın diye yapışkanlık yalnız sm ve üstünde (MOBILE-004).
        expect(bar().classList).toContain('sm:sticky');
        expect(bar().classList).toContain('top-16');
        expect(bar().classList).not.toContain('card');
    });
});
