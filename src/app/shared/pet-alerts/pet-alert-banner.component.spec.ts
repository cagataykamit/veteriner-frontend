import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { PetDetailVm } from '@/app/features/pets/models/pet-vm.model';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { PetAlertBannerComponent } from './pet-alert-banner.component';

describe('PetAlertBannerComponent', () => {
    let pets: jasmine.SpyObj<PetsService>;

    const create = (petId: string | null) => {
        TestBed.configureTestingModule({ imports: [PetAlertBannerComponent], providers: [{ provide: PetsService, useValue: pets }] });
        const fixture = TestBed.createComponent(PetAlertBannerComponent);
        fixture.componentRef.setInput('petId', petId);
        fixture.detectChanges();
        return fixture;
    };

    beforeEach(() => {
        pets = jasmine.createSpyObj<PetsService>('PetsService', ['getPetById']);
    });

    it('uyarısı olan hayvanda rozetleri ve notu gösterir', () => {
        pets.getPetById.and.returnValue(of({ petAlerts: { flags: ['Allergy', 'AnesthesiaRisk'], note: 'Penisiline alerjik' } } as unknown as PetDetailVm));
        const el: HTMLElement = create('p1').nativeElement;
        expect(el.querySelector('[aria-label="Hasta uyarıları"]')).not.toBeNull();
        expect(el.textContent).toContain('Alerji');
        expect(el.textContent).toContain('Anestezi riski');
        expect(el.textContent).toContain('Penisiline alerjik');
        expect(pets.getPetById).toHaveBeenCalledOnceWith('p1');
    });

    it('uyarı yoksa, hayvan seçilmediyse veya yükleme hatasında hiçbir şey çizmez', () => {
        pets.getPetById.and.returnValue(of({ petAlerts: { flags: [] as never[], note: null } } as unknown as PetDetailVm));
        expect((create('p1').nativeElement as HTMLElement).querySelector('[role="region"]')).toBeNull();
        TestBed.resetTestingModule();
        pets.getPetById.calls.reset();
        expect((create(null).nativeElement as HTMLElement).querySelector('[role="region"]')).toBeNull();
        expect(pets.getPetById).not.toHaveBeenCalled();
        TestBed.resetTestingModule();
        pets.getPetById.and.returnValue(throwError(() => new Error('x')));
        expect((create('p1').nativeElement as HTMLElement).querySelector('[role="region"]')).toBeNull();
    });
});
