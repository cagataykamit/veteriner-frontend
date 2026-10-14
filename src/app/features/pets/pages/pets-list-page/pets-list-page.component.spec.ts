import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { SpeciesService } from '@/app/features/species/services/species.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { PetsListPageComponent } from './pets-list-page.component';

/** Hayvanlar listesi: sahip araması "Arama" kutusundadır; ayrı müşteri seçicisi yoktur, müşteri kartından gelen süzgeç çip olarak görünür. */
describe('PetsListPageComponent — süzgeçler', () => {
    let pets: jasmine.SpyObj<PetsService>;

    function create(queryParams: Record<string, string> = {}): HTMLElement {
        sessionStorage.clear();
        pets = jasmine.createSpyObj<PetsService>('PetsService', ['getPets']);
        pets.getPets.and.returnValue(of({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }));
        TestBed.configureTestingModule({
            imports: [PetsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
                { provide: PetsService, useValue: pets },
                { provide: SpeciesService, useValue: { getSpeciesList: () => of([]) } },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const fixture = TestBed.createComponent(PetsListPageComponent);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    afterEach(() => sessionStorage.clear());

    it('ayrı müşteri seçicisi yoktur; tek arama kutusu sahip, telefon ve mikroçipi de kapsar', () => {
        const el = create();
        expect(el.querySelector('app-client-search')).toBeNull();
        expect(el.querySelectorAll('app-search-input').length).toBe(1);
        const placeholder = el.querySelector('input#petSearch')!.getAttribute('placeholder');
        expect(placeholder).toContain('mikroçip');
        expect(placeholder).toContain('telefon');
        expect(el.querySelector('app-context-filter-chip')).toBeNull();
    });

    it('müşteri kartından gelen ?clientId süzgeci çip olarak görünür ve isteğe gider', () => {
        const el = create({ clientId: 'c1' });
        expect(el.querySelector('app-context-filter-chip')).not.toBeNull();
        expect(pets.getPets.calls.mostRecent().args[0].clientId).toBe('c1');
    });
});
