import type { MockedObject } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { PetSearchFilterDto } from '@/app/entities/ai/models/ai-api.model';
import type { PetSearchInterpretationVm, PetSearchItemVm, PetSearchResultVm } from '@/app/entities/ai/models/ai-vm.model';
import { AiService } from '@/app/entities/ai/services/ai.service';
import { AI_PET_SEARCH_PAGE_SIZE, AiPetSearchService } from '@/app/entities/ai/services/ai-pet-search.service';
import { AiStatusService } from '@/app/entities/ai/services/ai-status.service';
import { SpeciesService } from '@/app/entities/species/services/species.service';

const understood: PetSearchInterpretationVm = { isEmpty: false, unsupported: [], dropped: [] };
const filter: PetSearchFilterDto = { species: ['CAT'], clinicalTerms: ['kusma'] };
const item = (petId: string) => ({ petId, name: petId, matches: [] }) as unknown as PetSearchItemVm;
const page = (items: PetSearchItemVm[], totalCount: number, p = 1): PetSearchResultVm => ({
    items,
    totalCount,
    page: p,
    pageSize: AI_PET_SEARCH_PAGE_SIZE,
    dropped: [],
    truncated: false,
    omittedTypesLabel: null
});

const problem = (status: number, code: string) => throwError(() => new HttpErrorResponse({ status, error: { extensions: { code } } }));

describe('AiPetSearchService', () => {
    let ai: MockedObject<AiService>;
    let status: { refresh: ReturnType<typeof vi.fn> };
    let search: AiPetSearchService;

    beforeEach(() => {
        ai = {
            interpretPetSearch: vi.fn().mockReturnValue(of({ filter, interpretation: understood })),
            searchPets: vi.fn().mockImplementation((f: PetSearchFilterDto) => of({ filter: f, result: page([item('p1')], 2) }))
        } as unknown as MockedObject<AiService>;
        status = { refresh: vi.fn() };
        TestBed.configureTestingModule({
            providers: [
                { provide: AiService, useValue: ai },
                { provide: AiStatusService, useValue: status },
                { provide: SpeciesService, useValue: { getSpeciesList: () => of([{ id: 's1', code: 'CAT', name: 'Kedi', isActive: true, displayOrder: 1 }]) } }
            ]
        });
        search = TestBed.inject(AiPetSearchService);
        search.ensureSpeciesLoaded();
    });

    it('cümle yorumlanır, anlaşılan filtreyle aranır; çipte tür adı görünür', () => {
        search.interpret('  son 3 ayda kusan kediler ');

        expect(ai.interpretPetSearch).toHaveBeenCalledWith('son 3 ayda kusan kediler');
        expect(ai.searchPets).toHaveBeenCalledWith(filter, 1, AI_PET_SEARCH_PAGE_SIZE);
        expect(search.state()).toEqual(expect.objectContaining({ phase: 'ready', query: 'son 3 ayda kusan kediler', filter }));
        expect(search.chips().map((c) => c.label)).toEqual(['Kedi', 'Şikâyet/tanı: kusma']);
    });

    it('anlaşılamayan cümlede arama yapılmaz', () => {
        ai.interpretPetSearch.mockReturnValue(of({ filter: {}, interpretation: { isEmpty: true, unsupported: ['ad ile arama'], dropped: [] } }));
        search.interpret('Karamel');

        expect(ai.searchPets).not.toHaveBeenCalled();
        expect(search.state().phase).toBe('ready');
        expect(search.state().result).toBeNull();
    });

    it('çip kaldırmak yalnız AI\'siz aramayı yeniden çağırır; son ölçüt kalkınca sonuç temizlenir', () => {
        search.interpret('kusan kediler');
        search.removeChip('species:CAT');

        expect(ai.interpretPetSearch).toHaveBeenCalledTimes(1);
        expect(ai.searchPets).toHaveBeenLastCalledWith({ species: null, clinicalTerms: ['kusma'] }, 1, AI_PET_SEARCH_PAGE_SIZE);

        search.removeChip('clinical:kusma');
        expect(ai.searchPets).toHaveBeenCalledTimes(2);
        expect(search.state().result).toBeNull();
        expect(search.chips()).toEqual([]);
    });

    it('daha fazla göster sonraki sayfayı ekler', () => {
        search.interpret('kusan kediler');
        ai.searchPets.mockReturnValue(of({ filter, result: page([item('p2')], 2, 2) }));
        search.loadMore();

        expect(ai.searchPets).toHaveBeenLastCalledWith(filter, 2, AI_PET_SEARCH_PAGE_SIZE);
        expect(search.state().result?.items.map((i) => i.petId)).toEqual(['p1', 'p2']);

        search.loadMore();
        expect(ai.searchPets).toHaveBeenCalledTimes(2);
    });

    it('yorumlama sorunu panelde kalır, durum tazelenir; tekrar dene cümleyi yeniden gönderir', () => {
        ai.interpretPetSearch.mockReturnValueOnce(problem(429, 'Ai.ClinicQuotaExceeded'));
        search.interpret('kusan kediler');

        expect(search.state()).toEqual(expect.objectContaining({ phase: 'problem', problemStep: 'interpret' }));
        expect(search.state().problem?.title).toBe('Bu ayın AI kredisi bitti');
        expect(status.refresh).toHaveBeenCalled();

        search.retry();
        expect(ai.interpretPetSearch).toHaveBeenCalledTimes(2);
        expect(search.state().phase).toBe('ready');
    });

    it('yetkisiz ölçüt aramada sorun olarak görünür; tekrar dene yalnız aramayı yineler', () => {
        ai.searchPets.mockReturnValueOnce(problem(403, 'AiSearch.Forbidden'));
        search.interpret('karma aşısı geciken köpekler');

        expect(search.state()).toEqual(expect.objectContaining({ phase: 'problem', problemStep: 'search' }));
        expect(search.state().problem?.title).toBe('Bu filtreyle arama yetkiniz yok');

        search.retry();
        expect(ai.interpretPetSearch).toHaveBeenCalledTimes(1);
        expect(ai.searchPets).toHaveBeenCalledTimes(2);
    });

    it('yeni arama durumu sıfırlar', () => {
        search.interpret('kusan kediler');
        search.reset();

        expect(search.state().phase).toBe('idle');
        expect(search.state().filter).toBeNull();
    });
});
