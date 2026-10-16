import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { PETS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { PetListItemVm } from '@/app/features/pets/models/pet-vm.model';
import { isRightAfterDetail, rowEditActions } from '@/app/shared/ui/row-action-button/row-action-button.testing';
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

/** ADR-025 madde 1: liste ilk açılışta yaşayanları gösterir; "Tümü" / "Vefat edenler" seçilebilir, derin bağlantılar korunur. */
describe('PetsListPageComponent — durum süzgeci varsayılanı', () => {
    let pets: jasmine.SpyObj<PetsService>;

    function create(queryParams: Record<string, string> = {}, stored?: object): PetsListPageComponent {
        sessionStorage.clear();

        if (stored) {
            sessionStorage.setItem('panel:pets:listState', JSON.stringify(stored));
        }

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

        return fixture.componentInstance;
    }

    const lastStatus = () => pets.getPets.calls.mostRecent().args[0].status;

    afterEach(() => sessionStorage.clear());

    it('ilk açılışta yalnız yaşayanları ister; süzgeç etkin sayılmaz', () => {
        const c = create();

        expect(lastStatus()).toBe('Active');
        expect(c.statusInput).toBe('Active');
        expect(c.isStatusActive()).toBeFalse();
        expect(c.statusOptions.map((o) => o.label)).toEqual(['Yaşayanlar', 'Vefat edenler', 'Tümü']);
    });

    it('"Tümü" seçilince durum gönderilmez, "Vefat edenler" Deceased gönderir', () => {
        const c = create();

        c.statusInput = 'All';
        c.applyFilters();
        expect(lastStatus()).toBeUndefined();
        expect(c.isStatusActive()).toBeTrue();

        c.statusInput = 'Deceased';
        c.applyFilters();
        expect(lastStatus()).toBe('Deceased');
    });

    it('?status=all ve ?status=deceased bağlantıyla seçilir', () => {
        create({ status: 'all' });
        expect(lastStatus()).toBeUndefined();

        TestBed.resetTestingModule();
        create({ status: 'Deceased' });
        expect(lastStatus()).toBe('Deceased');
    });

    it('müşteri kartının "Tümü →" bağlantısı (?clientId) önceki gibi o müşterinin tüm hastalarını ister', () => {
        const c = create({ clientId: 'c1' });

        expect(lastStatus()).toBeUndefined();
        expect(c.statusInput).toBe('All');
    });

    it('temizle varsayılana (yaşayanlar) döner; eski oturum kaydındaki boş durum varsayılandır', () => {
        const c = create({}, { search: '', speciesId: '', status: '', page: 1, pageSize: 10 });

        expect(lastStatus()).toBe('Active');

        c.statusInput = 'All';
        c.applyFilters();
        c.resetFilters();
        expect(lastStatus()).toBe('Active');
        expect(c.statusInput).toBe('Active');
    });
});

/** ADR-026 madde 6: Düzenle, detay sayfasındaki Düzenle ile aynı yetki ve salt okunur koşuluyla satırda Detay'ın yanındadır. */
describe('PetsListPageComponent — satırda Düzenle', () => {
    const pet: PetListItemVm = { id: 'p1', clientId: 'c1', speciesId: 's1', name: 'Pamuk', speciesName: 'Kedi', breed: 'Tekir', colorName: '', weight: '', status: 'Active' };

    function create(claims: string[], mutationBlocked = false): HTMLElement {
        sessionStorage.clear();
        TestBed.configureTestingModule({
            imports: [PetsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
                { provide: PetsService, useValue: { getPets: () => of({ items: [pet], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }) } },
                { provide: SpeciesService, useValue: { getSpeciesList: () => of([]) } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } }
            ]
        });
        const fixture = TestBed.createComponent(PetsListPageComponent);

        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    }

    afterEach(() => sessionStorage.clear());

    it("Pets.Update varsa tablo ve mobil kartta Detay'dan hemen sonra düzenleme sayfasına gider", () => {
        const edits = rowEditActions(create([PETS_UPDATE_CLAIM]));

        expect(edits.length).withContext('tablo + mobil kart').toBe(2);

        for (const edit of edits) {
            expect(edit.getAttribute('href')).toBe('/panel/pets/p1/edit');
            expect(isRightAfterDetail(edit)).toBeTrue();
        }
    });

    it('yetki yoksa Düzenle görünmez; salt okunur kiracıda pasiftir', () => {
        expect(rowEditActions(create([])).length).toBe(0);

        TestBed.resetTestingModule();
        const readOnly = rowEditActions(create([PETS_UPDATE_CLAIM], true));

        expect(readOnly.length).toBe(2);
        expect(readOnly.every((e) => e.tagName === 'BUTTON' && e.getAttribute('aria-disabled') === 'true')).toBeTrue();
    });
});
