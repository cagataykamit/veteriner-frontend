import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { PETS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { PetListItemVm } from '@/app/entities/pet/models/pet-vm.model';
import { isRightAfterDetail, rowEditActions } from '@/app/shared/ui/row-action-button/row-action-button.testing';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import { SpeciesService } from '@/app/entities/species/services/species.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AiService } from '@/app/entities/ai/services/ai.service';
import { AiPanelService } from '@/app/entities/ai/services/ai-panel.service';
import { PetsListPageComponent } from './pets-list-page.component';

/** AI klinikte kapalı: "Yapay zekâ ile ara" görünmez; diğer testler AI'dan etkilenmez. */
const aiClosed = { provide: AiService, useValue: { getStatus: () => of({ isAvailable: false, unavailableCode: 'Ai.ClinicNotEnabled', clinicMonthUsedPercent: 0 }) } };

/** Hayvanlar listesi: sahip araması "Arama" kutusundadır; ayrı müşteri seçicisi yoktur, müşteri kartından gelen süzgeç çip olarak görünür. */
describe('PetsListPageComponent — süzgeçler', () => {
    let pets: MockedObject<PetsService>;

    function create(queryParams: Record<string, string> = {}): HTMLElement {
        sessionStorage.clear();
        pets = {
            getPets: vi.fn().mockName('PetsService.getPets')
        } as unknown as MockedObject<PetsService>;
        pets.getPets.mockReturnValue(of({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }));
        TestBed.configureTestingModule({
            imports: [PetsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
                { provide: PetsService, useValue: pets },
                { provide: SpeciesService, useValue: { getSpeciesList: () => of([]) } },
                aiClosed,
                { provide: AuthService, useValue: { hasOperationClaim: () => true, getClinicId: () => 'k1' } },
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
        // R-06: kısa yer tutucu, kapsam ipucunda (title).
        const placeholder = el.querySelector('input#petSearch')!.getAttribute('title');

        expect(placeholder).toContain('mikroçip');
        expect(placeholder).toContain('telefon');
        expect(el.querySelector('app-context-filter-chip')).toBeNull();
    });

    it('müşteri kartından gelen ?clientId süzgeci çip olarak görünür ve isteğe gider', () => {
        const el = create({ clientId: 'c1' });

        expect(el.querySelector('app-context-filter-chip')).not.toBeNull();
        expect(vi.mocked(pets.getPets).mock.lastCall![0].clientId).toBe('c1');
    });
});

/** ADR-025 madde 1: liste ilk açılışta yaşayanları gösterir; "Tümü" / "Vefat edenler" seçilebilir, derin bağlantılar korunur. */
describe('PetsListPageComponent — durum süzgeci varsayılanı', () => {
    let pets: MockedObject<PetsService>;

    function create(queryParams: Record<string, string> = {}, stored?: object): PetsListPageComponent {
        sessionStorage.clear();

        if (stored) {
            sessionStorage.setItem('panel:pets:listState', JSON.stringify(stored));
        }

        pets = {
            getPets: vi.fn().mockName('PetsService.getPets')
        } as unknown as MockedObject<PetsService>;
        pets.getPets.mockReturnValue(of({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }));
        TestBed.configureTestingModule({
            imports: [PetsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
                { provide: PetsService, useValue: pets },
                { provide: SpeciesService, useValue: { getSpeciesList: () => of([]) } },
                aiClosed,
                { provide: AuthService, useValue: { hasOperationClaim: () => true, getClinicId: () => 'k1' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const fixture = TestBed.createComponent(PetsListPageComponent);

        fixture.detectChanges();

        return fixture.componentInstance;
    }

    const lastStatus = () => vi.mocked(pets.getPets).mock.lastCall![0].status;

    afterEach(() => sessionStorage.clear());

    it('ilk açılışta yalnız yaşayanları ister; süzgeç etkin sayılmaz', () => {
        const c = create();

        expect(lastStatus()).toBe('Active');
        expect(c.statusInput).toBe('Active');
        expect(c.isStatusActive()).toBe(false);
        expect(c.statusOptions.map((o) => o.label)).toEqual(['Yaşayanlar', 'Vefat edenler', 'Tümü']);
    });

    it('"Tümü" seçilince durum gönderilmez, "Vefat edenler" Deceased gönderir', () => {
        const c = create();

        c.statusInput = 'All';
        c.applyFilters();
        expect(lastStatus()).toBeUndefined();
        expect(c.isStatusActive()).toBe(true);

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
    const pet: PetListItemVm = { id: 'p1', clientId: 'c1', clientName: 'Ayşe Yılmaz', speciesId: 's1', name: 'Pamuk', speciesName: 'Kedi', breed: 'Tekir', colorName: '', weight: '', status: 'Active' };

    function create(claims: string[], mutationBlocked = false): HTMLElement {
        sessionStorage.clear();
        TestBed.configureTestingModule({
            imports: [PetsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
                { provide: PetsService, useValue: { getPets: () => of({ items: [pet], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }) } },
                { provide: SpeciesService, useValue: { getSpeciesList: () => of([]) } },
                aiClosed,
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

        expect(edits.length, 'tablo + mobil kart').toBe(2);

        for (const edit of edits) {
            expect(edit.getAttribute('href')).toBe('/panel/pets/p1/edit');
            expect(isRightAfterDetail(edit)).toBe(true);
        }
    });

    it('yetki yoksa Düzenle görünmez; salt okunur kiracıda pasiftir', () => {
        expect(rowEditActions(create([])).length).toBe(0);

        TestBed.resetTestingModule();
        const readOnly = rowEditActions(create([PETS_UPDATE_CLAIM], true));

        expect(readOnly.length).toBe(2);
        expect(readOnly.every((e) => e.tagName === 'BUTTON' && e.getAttribute('aria-disabled') === 'true')).toBe(true);
    });

    /** M-01: aynı adlı hastalar sahibin adıyla ayrışır; telefon kartında sabit "Müşteri" kelimesi değil ad yazılır. */
    it('tabloda ve telefon kartında müşteri adı müşteri kartına bağlanır', () => {
        const el = create([]);
        const clientLinks = Array.from(el.querySelectorAll('a[href="/panel/clients/c1"]'));

        expect(clientLinks.length, 'tablo + mobil kart').toBe(2);
        expect(clientLinks.every((a) => a.textContent?.trim() === 'Ayşe Yılmaz')).toBe(true);
        expect(el.textContent).not.toContain('Renk:');
    });
});

/** AI-006: doğal dille arama girişi listenin başlığında; görünürlüğü AI durumu belirler, basınca yan panelde arama açılır. */
describe('PetsListPageComponent — Yapay zekâ ile ara', () => {
    function create(claims: string[], status: { isAvailable: boolean; unavailableCode: string | null }): HTMLElement {
        sessionStorage.clear();
        TestBed.configureTestingModule({
            imports: [PetsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
                { provide: PetsService, useValue: { getPets: () => of({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }) } },
                { provide: SpeciesService, useValue: { getSpeciesList: () => of([]) } },
                { provide: AiService, useValue: { getStatus: () => of({ ...status, clinicMonthUsedPercent: 0 }) } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c), getClinicId: () => 'k1' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => true } }
            ]
        });
        const fixture = TestBed.createComponent(PetsListPageComponent);

        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    }

    const entry = (el: HTMLElement) => el.querySelector('[data-testid="ai-entry-button"]') as HTMLButtonElement | null;

    afterEach(() => sessionStorage.clear());

    it('Ai.Use ve açık AI ile görünür (salt okunurda da); basınca panelde arama açılır', () => {
        const el = create(['Ai.Use'], { isAvailable: true, unavailableCode: null });

        expect(entry(el)?.textContent).toContain('Yapay zekâ ile ara');
        entry(el)!.click();
        expect(TestBed.inject(AiPanelService).content()).toEqual({ kind: 'search' });
    });

    it('izin yoksa ya da klinikte kapalıysa görünmez', () => {
        expect(entry(create([], { isAvailable: true, unavailableCode: null }))).toBeNull();

        TestBed.resetTestingModule();
        expect(entry(create(['Ai.Use'], { isAvailable: false, unavailableCode: 'Ai.ClinicNotEnabled' }))).toBeNull();
    });
});
