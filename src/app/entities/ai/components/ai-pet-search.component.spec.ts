import type { MockedObject } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import type { PetSearchResultVm } from '@/app/entities/ai/models/ai-vm.model';
import { AiPetSearchComponent } from '@/app/entities/ai/components/ai-pet-search.component';
import { AiService } from '@/app/entities/ai/services/ai.service';
import { AiPetSearchService } from '@/app/entities/ai/services/ai-pet-search.service';
import { AiStatusService } from '@/app/entities/ai/services/ai-status.service';
import { SpeciesService } from '@/app/entities/species/services/species.service';

const result: PetSearchResultVm = {
    items: [
        {
            petId: 'p1',
            name: 'Pamuk',
            speciesName: 'Kedi',
            detail: 'Dişi · 3 yaş',
            isDeceased: false,
            clientId: 'c1',
            clientName: 'Deniz Aydın',
            matches: [{ source: { type: 'Examination', id: 'e1', label: 'Muayene · 10 Kas', icon: 'pi-file-edit', link: ['/panel/examinations', 'e1'] }, text: 'Kusma', isOverdue: false }]
        }
    ],
    totalCount: 3,
    page: 1,
    pageSize: 25,
    dropped: [],
    truncated: false,
    omittedTypesLabel: 'tedavi'
};

describe('AiPetSearchComponent', () => {
    let ai: MockedObject<AiService>;
    let fixture: ComponentFixture<AiPetSearchComponent>;
    const el = () => fixture.nativeElement as HTMLElement;
    const all = (id: string) => Array.from(el().querySelectorAll(`[data-testid="${id}"]`)) as HTMLElement[];

    beforeEach(() => {
        ai = {
            interpretPetSearch: vi.fn().mockReturnValue(of({ filter: { species: ['CAT'], clinicalTerms: ['kusma'] }, interpretation: { isEmpty: false, unsupported: ['ad ile arama'], dropped: [] } })),
            searchPets: vi.fn().mockImplementation((filter: object) => of({ filter, result }))
        } as unknown as MockedObject<AiService>;
        TestBed.configureTestingModule({
            imports: [AiPetSearchComponent],
            providers: [
                provideRouter([]),
                { provide: AiService, useValue: ai },
                { provide: AiStatusService, useValue: { refresh: vi.fn() } },
                { provide: SpeciesService, useValue: { getSpeciesList: () => of([{ id: 's1', code: 'CAT', name: 'Kedi', isActive: true, displayOrder: 1 }]) } }
            ]
        });
        TestBed.inject(AiPetSearchService).reset();
        fixture = TestBed.createComponent(AiPetSearchComponent);
        fixture.detectChanges();
    });

    async function ask(text: string): Promise<void> {
        const box = el().querySelector('[data-testid="ai-search-query"]') as HTMLTextAreaElement;

        box.value = text;
        box.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        await fixture.whenStable();
        (el().querySelector('[data-testid="ai-search-submit"]') as HTMLButtonElement).click();
        fixture.detectChanges();
    }

    it('önce örnekler görünür; örneğe basmak yalnız kutuya yazar', async () => {
        expect(all('ai-search-examples').length).toBe(1);
        (el().querySelector('[data-testid="ai-search-examples"] button') as HTMLButtonElement).click();
        fixture.detectChanges();
        await fixture.whenStable();

        expect((el().querySelector('[data-testid="ai-search-query"]') as HTMLTextAreaElement).value).toContain('kusma');
        expect(ai.interpretPetSearch).not.toHaveBeenCalled();
    });

    it('anlaşılan filtre çip olarak, çevrilemeyen kısım not olarak, sonuçlar kayıt bağlantılarıyla görünür', async () => {
        await ask('son 3 ayda kusan kediler');

        expect(ai.interpretPetSearch).toHaveBeenCalledWith('son 3 ayda kusan kediler');
        expect(all('ai-search-chip').map((c) => c.textContent?.trim())).toEqual(['Kedi', 'Şikâyet/tanı: kusma']);
        expect(all('ai-search-unsupported')[0].textContent).toContain('ad ile arama');
        expect(all('ai-search-omitted')[0].textContent).toContain('tedavi');

        const row = all('ai-search-item')[0];

        expect(row.querySelector('a[href="/panel/pets/p1"]')?.textContent).toContain('Pamuk');
        expect(row.querySelector('a[href="/panel/examinations/e1"]')).not.toBeNull();
        expect(row.textContent).toContain('Deniz Aydın');
        expect(all('ai-search-more')[0].textContent).toContain('Daha fazla göster (2)');
    });

    it('çipi kaldırmak AI\'ye gitmeden yeniden arar', async () => {
        await ask('son 3 ayda kusan kediler');
        (all('ai-search-chip-remove')[0] as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(ai.interpretPetSearch).toHaveBeenCalledTimes(1);
        expect(ai.searchPets).toHaveBeenLastCalledWith({ species: null, clinicalTerms: ['kusma'] }, 1, 25);
        expect(all('ai-search-chip').map((c) => c.textContent?.trim())).toEqual(['Şikâyet/tanı: kusma']);
    });

    it('cümleden filtre çıkmazsa bunu söyler ve aramaz', async () => {
        ai.interpretPetSearch.mockReturnValue(of({ filter: {}, interpretation: { isEmpty: true, unsupported: [], dropped: [] } }));
        await ask('Karamel');

        expect(all('ai-search-empty-filter').length).toBe(1);
        expect(ai.searchPets).not.toHaveBeenCalled();
    });
});
