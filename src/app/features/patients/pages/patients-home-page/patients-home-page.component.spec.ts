import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { PatientSearchService, type PatientSearchResultVm } from '@/app/features/patients/services/patient-search.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { VisitsService } from '@/app/features/visits/services/visits.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { PatientsHomePageComponent } from './patients-home-page.component';

const PAMUK = { petId: 'p1', petName: 'Pamuk', summary: 'Kedi · Tekir', microchip: '985', clientId: 'c1', ownerName: 'Ali Veli', ownerPhone: '+90 532 123 45 67' };

describe('PatientsHomePageComponent (arama-öncelikli Hastalar girişi)', () => {
    let claims: Set<string>;
    let mutationBlocked: boolean;
    let search: jasmine.Spy;

    const create = () => {
        TestBed.configureTestingModule({
            imports: [PatientsHomePageComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c), getClinicId: () => 'cl', getUserId: () => 'u1' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } },
                { provide: PatientSearchService, useValue: { search } },
                { provide: VisitsService, useValue: { getVeterinarians: () => ({ subscribe: () => undefined }) } },
                { provide: ClientsService, useValue: {} },
                { provide: PetsService, useValue: {} }
            ]
        });
        const fixture = TestBed.createComponent(PatientsHomePageComponent);
        fixture.detectChanges();
        return fixture;
    };

    const typeAndSearch = (fixture: ReturnType<typeof create>, text: string) => {
        fixture.componentInstance.term.set(text);
        fixture.componentInstance.onSearch();
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    };

    beforeEach(() => {
        claims = new Set(['Clients.Read', 'Pets.Read', 'Clients.Create', 'Pets.Create', 'Visits.Create', 'Examinations.Create', 'Appointments.Create']);
        mutationBlocked = false;
        search = jasmine.createSpy('search').and.returnValue(of({ patients: [PAMUK], owners: [], failedKinds: [] } satisfies PatientSearchResultVm));
    });

    it('açılışta önce arama kutusu görünür; tablo yoktur ve arama yapılmaz', () => {
        const el: HTMLElement = create().nativeElement;
        expect(el.querySelector('input#patientSearch')).not.toBeNull();
        expect(el.querySelector('table')).toBeNull();
        expect(search).not.toHaveBeenCalled();
        expect(el.textContent).toContain('Tümünü listele');
    });

    it('sonuç hayvan ve sahibi birlikte gösterir; satırda Geldi, Muayene başlat ve Randevu al vardır', () => {
        const el = typeAndSearch(create(), 'pamuk');
        expect(search).toHaveBeenCalledWith('pamuk');
        const row = el.querySelector('.patient-row') as HTMLElement;
        expect(row.textContent).toContain('Pamuk');
        expect(row.textContent).toContain('Sahip: Ali Veli');
        expect(row.textContent).toContain('Mikroçip: 985');
        const labels = Array.from(row.querySelectorAll('a,button')).map((e) => e.textContent?.trim());
        expect(labels).toContain('Geldi');
        const exam = Array.from(row.querySelectorAll('a')).find((a) => a.textContent?.includes('Muayene başlat'))!;
        expect(exam.getAttribute('href')).toContain('/panel/examinations/new');
        expect(exam.getAttribute('href')).toContain('petId=p1');
        expect(exam.getAttribute('href')).toContain('clientId=c1');
        expect(labels).toContain('Randevu al');
    });

    it('yetkisiz eylem satırda görünmez; salt okunur modda eylemler gizlenir', () => {
        claims.delete('Visits.Create');
        claims.delete('Appointments.Create');
        let row = typeAndSearch(create(), 'pamuk').querySelector('.patient-row') as HTMLElement;
        expect(row.textContent).not.toContain('Geldi');
        expect(row.textContent).not.toContain('Randevu al');
        expect(row.textContent).toContain('Muayene başlat');
        TestBed.resetTestingModule();
        mutationBlocked = true;
        row = typeAndSearch(create(), 'pamuk').querySelector('.patient-row') as HTMLElement;
        expect(row.textContent).not.toContain('Muayene başlat');
    });

    it('sonuç yoksa mesaj ve öne çıkan Yeni kayıt eylemi görünür', () => {
        search.and.returnValue(of({ patients: [], owners: [], failedKinds: [] }));
        const fixture = create();
        const el = typeAndSearch(fixture, 'zzz');
        expect(el.textContent).toContain('için sonuç bulunamadı');
        expect(el.textContent).toContain('Yeni kayıt: müşteri ve hayvan');
        expect(fixture.componentInstance.noResults()).toBeTrue();
    });

    it('sonuç varken de Yeni kayıt aramanın altında ikincil olarak durur; kayıt izni yoksa yoktur', () => {
        let fixture = create();
        expect(typeAndSearch(fixture, 'pamuk').textContent).toContain('Yeni kayıt: müşteri ve hayvan');
        expect(fixture.componentInstance.noResults()).toBeFalse();
        TestBed.resetTestingModule();
        claims.delete('Clients.Create');
        fixture = create();
        expect(typeAndSearch(fixture, 'pamuk').textContent).not.toContain('Yeni kayıt');
    });

    it('hayvanı olmayan sahip satırında Yeni hayvan eylemi vardır', () => {
        search.and.returnValue(of({ patients: [], owners: [{ clientId: 'c9', name: 'Veli Can', phone: '0532' }], failedKinds: [] }));
        const el = typeAndSearch(create(), 'veli');
        const row = el.querySelector('.owner-row') as HTMLElement;
        expect(row.textContent).toContain('Veli Can');
        const link = Array.from(row.querySelectorAll('a')).find((a) => a.textContent?.includes('Yeni hayvan'))!;
        expect(link.getAttribute('href')).toContain('/panel/pets/new');
        expect(link.getAttribute('href')).toContain('clientId=c9');
    });

    it('arama hatasında uyarı gösterilir; kısa terimde arama yapılmaz', () => {
        search.and.returnValue(throwError(() => new Error('x')));
        const fixture = create();
        expect(typeAndSearch(fixture, 'pa').querySelector('[role="alert"]')?.textContent).toContain('Arama yapılamadı');
        search.calls.reset();
        typeAndSearch(fixture, 'p');
        expect(search).not.toHaveBeenCalled();
        expect(fixture.componentInstance.status()).toBe('idle');
    });
});
