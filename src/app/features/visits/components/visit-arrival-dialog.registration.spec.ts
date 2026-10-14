import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { SpeciesService } from '@/app/features/species/services/species.service';
import type { PetSuggestion } from '@/app/features/visits/models/visit-vm.model';
import { VisitsService } from '@/app/features/visits/services/visits.service';
import { VisitArrivalDialogComponent } from './visit-arrival-dialog.component';

const registeredPet: PetSuggestion = { id: 'p-new', label: 'Pamuk — Kedi · Sahip: Ayşe', clientId: 'c-new', clientName: 'Ayşe' };
const visitResult = {
    created: true,
    visit: {
        id: 'v1',
        clinicId: 'c1',
        petId: 'p-new',
        appointmentId: null,
        responsibleVeterinarianUserId: null,
        responsibleVeterinarianName: null,
        arrivedAtUtc: '2026-10-10T07:00:00Z',
        careStatus: 'Waiting' as const,
        isVoided: false,
        isUrgent: false
    }
};

describe('VisitArrivalDialogComponent (hızlı kayıt entegrasyonu)', () => {
    let fixture: ComponentFixture<VisitArrivalDialogComponent>;
    let cmp: VisitArrivalDialogComponent;
    let visits: jasmine.SpyObj<VisitsService>;

    const create = (claims: string[]) => {
        visits = jasmine.createSpyObj<VisitsService>('VisitsService', ['createVisit', 'getVeterinarians']);
        visits.getVeterinarians.and.returnValue(of([]));
        TestBed.configureTestingModule({
            imports: [VisitArrivalDialogComponent],
            providers: [
                { provide: VisitsService, useValue: visits },
                { provide: AuthService, useValue: { getClinicId: () => 'c1', getUserId: () => null, hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: ClientsService, useValue: { getClientById: () => of({ fullName: 'Ali Veli' }), getClients: () => of({ items: [] }), quickRegister: () => of({ clientId: 'c-new', petId: 'p-new' }) } },
                { provide: PetsService, useValue: { getPets: () => of({ items: [] }), createPet: () => of({ id: 'p-new' }) } },
                { provide: SpeciesService, useValue: { getSpeciesList: () => of([{ id: 's1', name: 'Kedi' }]) } }
            ]
        });
        fixture = TestBed.createComponent(VisitArrivalDialogComponent);
        cmp = fixture.componentInstance;
        cmp.visible.set(true);
        fixture.detectChanges();
    };

    const links = () => Array.from(document.querySelectorAll('p-button button')).map((b) => b.textContent?.trim() ?? '');

    afterEach(() => fixture.destroy());

    it('Clients.Create ve Pets.Create yetkisi olana "Yeni müşteri ve hasta ekle" bağlantısı görünür', () => {
        create(['Clients.Create', 'Pets.Create']);
        expect(links()).toContain('Yeni müşteri ve hasta ekle');
    });
it('yetkili için arama yapılmadan da "Hasta kayıtlı değil mi?" ile görünür; resepsiyon ipucu çıkmaz', () => {        create(['Clients.Create', 'Pets.Create']);        const text = document.body.textContent ?? '';        expect(text).toContain('Hasta kayıtlı değil mi?');        expect(text).not.toContain('kaydı resepsiyon oluşturur');    });    it('yetkisiz için resepsiyon ipucu görünür, kayıt bağlantısı görünmez', () => {        create([]);        const text = document.body.textContent ?? '';        expect(text).toContain('Hasta kayıtlı değilse kaydı resepsiyon oluşturur.');        expect(text).not.toContain('Hasta kayıtlı değil mi?');        expect(links()).not.toContain('Yeni müşteri ve hasta ekle');    });

    it('yetkisizde (ya da yalnızca birinde) bağlantı görünmez', () => {
        create(['Clients.Create']);
        expect(links()).not.toContain('Yeni müşteri ve hasta ekle');
        fixture.destroy();
        TestBed.resetTestingModule();
        create([]);
        expect(links()).not.toContain('Yeni müşteri ve hasta ekle');
        expect(links()).not.toContain('Bu sahibe yeni hasta ekle');
    });

    it('"Bu sahibe yeni hayvan" yalnızca Pets.Create ister ve sahibi olan hasta seçilince görünür', () => {
        create(['Pets.Create']);
        expect(links()).not.toContain('Yeni müşteri ve hasta ekle');
        expect(links()).not.toContain('Bu sahibe yeni hasta ekle');

        cmp.form.controls.pet.setValue({ id: 'p1', label: 'Cedi — Köpek · Sahip: maksut', clientId: 'cl1', clientName: 'maksut' });
        fixture.detectChanges();
        expect(links()).toContain('Bu sahibe yeni hasta ekle');
        expect(cmp.selectedOwner()).toEqual({ id: 'cl1', name: 'maksut' });
    });

    it('hızlı kayıt tamamlanınca hasta seçilir ve geliş (Visit) hemen açılır', () => {
        create(['Clients.Create', 'Pets.Create']);
        visits.createVisit.and.returnValue(of(visitResult));
        const arrived: unknown[] = [];
        cmp.arrived.subscribe((r) => arrived.push(r));

        cmp.openRegistration(null);
        cmp.onRegistered(registeredPet);

        expect(visits.createVisit).toHaveBeenCalledOnceWith({ clinicId: 'c1', petId: 'p-new', responsibleVeterinarianUserId: '', isUrgent: false });
        expect(arrived.length).toBe(1);
        expect(cmp.registration()).toBeNull();
    });

    it('Visit adımı hata verirse hasta yeniden oluşturulmaz; mesaj hangi adımın başarısız olduğunu söyler; tekrar denenebilir', () => {
        create(['Clients.Create', 'Pets.Create']);
        visits.createVisit.and.returnValue(throwError(() => new Error('Sunucu hatası.')));
        cmp.onRegistered(registeredPet);

        expect(cmp.submitError()).toBe("Kayıt tamamlandı, ancak geliş kaydı oluşturulamadı: Sunucu hatası. Yeniden denemek için Kaydet'e basın.");
        expect(cmp.form.controls.pet.value).toEqual(registeredPet);

        visits.createVisit.and.returnValue(of(visitResult));
        cmp.onSubmit();
        expect(visits.createVisit).toHaveBeenCalledTimes(2);
        expect(visits.createVisit.calls.mostRecent().args[0].petId).toBe('p-new');
    });
});
