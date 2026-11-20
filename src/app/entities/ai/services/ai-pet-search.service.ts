import { computed, inject, Injectable, signal } from '@angular/core';
import type { Subscription } from 'rxjs';
import type { PetSearchFilterDto } from '@/app/entities/ai/models/ai-api.model';
import type { PetSearchInterpretationVm, PetSearchResultVm } from '@/app/entities/ai/models/ai-vm.model';
import { AiService } from '@/app/entities/ai/services/ai.service';
import { AiStatusService } from '@/app/entities/ai/services/ai-status.service';
import { type AiProblem, aiProblemFromError } from '@/app/entities/ai/utils/ai-error.utils';
import { isPetSearchFilterEmpty, petSearchFilterChips, removePetSearchChip } from '@/app/entities/ai/utils/pet-search-filter.utils';
import { SpeciesService } from '@/app/entities/species/services/species.service';

export const AI_PET_SEARCH_PAGE_SIZE = 25;

/**
 * Doğal dille hasta aramasının durumu (AI-006): `interpreting` cümle filtreye çevriliyor (AI, kota), `searching` filtreyle aranıyor
 * (AI'siz), `ready` sonuç (ya da anlaşılamadı) hazır, `problem` istek sorunu (yalnız panelde görünür).
 */
export interface AiPetSearchState {
    phase: 'idle' | 'interpreting' | 'searching' | 'ready' | 'problem';
    /** Son yorumlanan cümle; "Tekrar dene" ve giriş kutusu için. */
    query: string;
    filter: PetSearchFilterDto | null;
    interpretation: PetSearchInterpretationVm | null;
    result: PetSearchResultVm | null;
    problem: AiProblem | null;
    /** Sorun yorumlamada mı (yeniden dene cümleyi yeniden gönderir) yoksa aramada mı. */
    problemStep: 'interpret' | 'search' | null;
    retryAvailableAt: number | null;
    loadingMore: boolean;
}

const INITIAL: AiPetSearchState = {
    phase: 'idle',
    query: '',
    filter: null,
    interpretation: null,
    result: null,
    problem: null,
    problemStep: null,
    retryAvailableAt: null,
    loadingMore: false
};

/**
 * Arama paneli sayfalar arasında korunur: sonuçtan kayda gidip dönünce sonuçlar durur. Kota yalnız cümle yorumlanırken harcanır;
 * çip kaldırmak ve "daha fazla" AI'siz arama ucuna gider.
 */
@Injectable({ providedIn: 'root' })
export class AiPetSearchService {
    private readonly ai = inject(AiService);
    private readonly aiStatus = inject(AiStatusService);
    private readonly speciesService = inject(SpeciesService);

    readonly state = signal<AiPetSearchState>(INITIAL);
    private readonly speciesNames = signal<ReadonlyMap<string, string>>(new Map());

    readonly chips = computed(() => petSearchFilterChips(this.state().filter, this.speciesNames()));
    readonly busy = computed(() => this.state().phase === 'interpreting' || this.state().phase === 'searching');

    private sub: Subscription | null = null;
    private speciesLoaded = false;

    /** Tür kodu → ad (çip etiketi); bir kez yüklenir, hata çipte kodu bırakır. */
    ensureSpeciesLoaded(): void {
        if (this.speciesLoaded) {
            return;
        }

        this.speciesLoaded = true;
        this.speciesService.getSpeciesList({ activeOnly: true }).subscribe({
            next: (items) => this.speciesNames.set(new Map(items.filter((s) => !!s.code).map((s) => [s.code, s.name || s.code]))),
            error: () => (this.speciesLoaded = false)
        });
    }

    interpret(query: string): void {
        const text = query.trim();

        if (!text) {
            return;
        }

        this.sub?.unsubscribe();
        this.state.set({ ...INITIAL, phase: 'interpreting', query: text });
        this.sub = this.ai.interpretPetSearch(text).subscribe({
            next: ({ filter, interpretation }) => {
                this.state.update((s) => ({ ...s, filter, interpretation }));

                if (interpretation.isEmpty || isPetSearchFilterEmpty(filter)) {
                    this.state.update((s) => ({ ...s, phase: 'ready' }));
                } else {
                    this.search(filter);
                }
            },
            error: (err: unknown) => this.fail(err, 'interpret')
        });
    }

    /** Çipi kaldırıp AI'siz yeniden arar; ölçüt kalmazsa sonuç temizlenir. */
    removeChip(chipId: string): void {
        const filter = this.state().filter;

        if (!filter || this.busy()) {
            return;
        }

        const next = removePetSearchChip(filter, chipId);

        if (isPetSearchFilterEmpty(next)) {
            this.sub?.unsubscribe();
            this.state.update((s) => ({ ...s, phase: 'ready', filter: next, result: null, problem: null, problemStep: null }));

            return;
        }

        this.search(next);
    }

    loadMore(): void {
        const s = this.state();

        if (s.phase !== 'ready' || !s.filter || !s.result || s.loadingMore || s.result.items.length >= s.result.totalCount) {
            return;
        }

        this.state.update((x) => ({ ...x, loadingMore: true }));
        this.sub = this.ai.searchPets(s.filter, s.result.page + 1, AI_PET_SEARCH_PAGE_SIZE).subscribe({
            next: ({ result }) =>
                this.state.update((x) => ({
                    ...x,
                    loadingMore: false,
                    result: x.result ? { ...result, items: [...x.result.items, ...result.items] } : result
                })),
            error: (err: unknown) => {
                this.state.update((x) => ({ ...x, loadingMore: false }));
                this.fail(err, 'search');
            }
        });
    }

    retry(): void {
        const s = this.state();

        if (s.problemStep === 'interpret') {
            this.interpret(s.query);
        } else if (s.filter) {
            this.search(s.filter);
        }
    }

    /** "Yeni arama": cümle kutusuna döner. */
    reset(): void {
        this.sub?.unsubscribe();
        this.sub = null;
        this.state.set(INITIAL);
    }

    private search(filter: PetSearchFilterDto): void {
        this.sub?.unsubscribe();
        this.state.update((s) => ({ ...s, phase: 'searching', filter, problem: null, problemStep: null, retryAvailableAt: null }));
        this.sub = this.ai.searchPets(filter, 1, AI_PET_SEARCH_PAGE_SIZE).subscribe({
            next: ({ filter: applied, result }) => this.state.update((s) => ({ ...s, phase: 'ready', filter: applied, result })),
            error: (err: unknown) => this.fail(err, 'search')
        });
    }

    private fail(err: unknown, step: 'interpret' | 'search'): void {
        const problem = aiProblemFromError(err, 'search');

        this.state.update((s) => ({
            ...s,
            phase: 'problem',
            problem,
            problemStep: step,
            retryAvailableAt: problem.retryAfterSeconds ? Date.now() + problem.retryAfterSeconds * 1000 : null
        }));

        if (problem.refreshStatus) {
            this.aiStatus.refresh();
        }
    }
}
