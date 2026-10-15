import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { VisitsService } from '@/app/features/visits/services/visits.service';
import { VisitArrivalDialogComponent } from './visit-arrival-dialog.component';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Gerçek p-autocomplete DOM'u ile: regresyon — p-dialog'un onShow olayı açılıştan ~300 ms sonra tetiklenir ve form
 * sıfırlaması kullanıcının yazdığı arama metnini siliyordu (alan "yazılmıyor" gibi görünüyordu).
 */
describe('VisitArrivalDialogComponent (hasta arama alanına yazma)', () => {
    let fixture: ComponentFixture<VisitArrivalDialogComponent>;
    let cmp: VisitArrivalDialogComponent;
    let getPets: jasmine.Spy;

    beforeEach(async () => {
        getPets = jasmine.createSpy('getPets').and.returnValue(of({ items: [{ id: 'p1', clientId: 'cl1', name: 'Pamuk', speciesName: 'Kedi' }] }));
        await TestBed.configureTestingModule({
            imports: [VisitArrivalDialogComponent],
            providers: [
                { provide: VisitsService, useValue: { getVeterinarians: () => of([]) } },
                { provide: AuthService, useValue: { getClinicId: () => 'c1', getUserId: () => null, hasOperationClaim: () => false } },
                { provide: ClientsService, useValue: { getClientById: () => of({ fullName: 'Ali Veli' }) } },
                { provide: PetsService, useValue: { getPets } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(VisitArrivalDialogComponent);
        cmp = fixture.componentInstance;
        cmp.visible.set(true);
        fixture.detectChanges();
    });

    afterEach(() => fixture.destroy());

    it('yazılan metin, dialog açılış animasyonu bittikten sonra da silinmez; arama tetiklenir; seçilince geçerli olur', async () => {
        const input = document.querySelector('#va-pet') as HTMLInputElement;

        expect(input).withContext('arama alanı render edilmeli').not.toBeNull();
        expect(input.disabled).toBeFalse();
        expect(input.readOnly).toBeFalse();

        input.focus();
        input.value = 'pam';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        // onShow (~300 ms) ve arama gecikmesi (300 ms) geçsin.
        await wait(800);
        fixture.detectChanges();

        expect(input.value).toBe('pam');
        expect(getPets).toHaveBeenCalledOnceWith({ page: 1, pageSize: 10, search: 'pam', status: 'Active' });
        expect(cmp.petSuggestions().length).toBe(1);
        expect(cmp.form.controls.pet.valid).withContext('yalnızca yazılmış metin geçersiz').toBeFalse();

        cmp.form.controls.pet.setValue(cmp.petSuggestions()[0]);
        expect(cmp.form.controls.pet.valid).toBeTrue();
    });
});
