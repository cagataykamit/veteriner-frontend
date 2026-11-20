import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { AiSourceLinkComponent } from '@/app/entities/ai/components/ai-source-link.component';
import { AiStateComponent } from '@/app/entities/ai/components/ai-state.component';
import { AiPetSearchService } from '@/app/entities/ai/services/ai-pet-search.service';

/** Panelde gösterilen örnek cümleler; tıklanınca kutuya yazılır (gönderilmez). */
export const AI_PET_SEARCH_EXAMPLES = ['Son 3 ayda kusma şikâyetiyle gelen kediler', 'Karma aşısı geciken köpekler', 'Bu yıl amoksisilin verilen 10 yaş üstü köpekler'];

/**
 * Doğal dille hasta araması paneli (AI-006): cümle → "Şöyle anladım" filtre çipleri → sonuç listesi (hasta kartı ve eşleşen
 * kayıtlara bağlantı). Çip kaldırmak AI'siz yeniden arar. Model hasta kaydı görmez; sonuç kayda geçmez.
 */
@Component({
    selector: 'app-ai-pet-search',
    standalone: true,
    imports: [FormsModule, RouterLink, ButtonModule, TextareaModule, AiStateComponent, AiSourceLinkComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'flex flex-col flex-1 min-h-0' },
    template: `
        @let s = search.state();
        <div class="flex-1 min-h-0 overflow-y-auto px-4 pb-4 flex flex-col gap-3" data-testid="ai-search-body">
            <form class="flex flex-col gap-2" (ngSubmit)="submit()">
                <label for="aiPetSearchQuery" class="text-sm font-semibold">Ne arıyorsunuz?</label>
                <textarea
                    pTextarea
                    id="aiPetSearchQuery"
                    name="query"
                    rows="2"
                    [autoResize]="true"
                    maxlength="500"
                    class="w-full"
                    placeholder="Ör. son 3 ayda kusma şikâyetiyle gelen kediler"
                    [(ngModel)]="queryInput"
                    (keydown.enter)="onEnter($event)"
                    data-testid="ai-search-query"
                ></textarea>
                <div class="flex items-center gap-2">
                    <span class="flex-1 text-xs text-muted-color">Hasta ya da sahip adıyla aramak için listedeki arama kutusunu kullanın.</span>
                    <button pButton type="submit" size="small" [disabled]="!queryInput().trim() || search.busy()" data-testid="ai-search-submit"><i class="pi pi-sparkles"></i>Ara</button>
                </div>
            </form>

            @switch (s.phase) {
                @case ('idle') {
                    <div class="flex flex-col gap-1.5" data-testid="ai-search-examples">
                        <span class="text-xs font-bold uppercase tracking-wide text-muted-color">Örnekler</span>
                        @for (example of examples; track example) {
                            <button type="button" class="text-left text-sm text-primary bg-transparent border-0 p-0 cursor-pointer hover:underline" (click)="queryInput.set(example)">{{ example }}</button>
                        }
                    </div>
                }
                @case ('interpreting') {
                    <app-ai-state loadingText="Cümle filtreye çevriliyor…" />
                }
                @case ('problem') {
                    <app-ai-state
                        [icon]="s.problem!.retryAfterSeconds ? 'pi-clock' : 'pi-exclamation-circle'"
                        tone="warn"
                        [title]="s.problem!.title"
                        [message]="s.problem!.message"
                        [retryLabel]="s.problem!.retryable ? (s.problem!.retryAfterSeconds ? 'Yeniden dene' : 'Tekrar dene') : null"
                        [retryAvailableAt]="s.retryAvailableAt"
                        (retry)="search.retry()"
                    />
                }
            }

            @if (s.phase !== 'idle' && s.phase !== 'interpreting' && s.filter) {
                <section class="flex flex-col gap-2" aria-label="Anlaşılan filtre" data-testid="ai-search-understood">
                    <h3 class="m-0 text-xs font-bold uppercase tracking-wide text-muted-color">Şöyle anladım</h3>
                    @if (search.chips().length) {
                        <div class="flex flex-wrap gap-1.5">
                            @for (chip of search.chips(); track chip.id) {
                                <span class="inline-flex items-center gap-1 rounded-full border border-ai-border bg-ai-surface pl-2 pr-1 py-0.5 text-xs font-semibold" data-testid="ai-search-chip">
                                    <i [class]="'pi ' + chip.icon + ' text-[0.7rem] text-ai'" aria-hidden="true"></i>{{ chip.label }}
                                    <button
                                        type="button"
                                        class="inline-flex items-center justify-center w-5 h-5 rounded-full border-0 bg-transparent cursor-pointer text-muted-color hover:text-color"
                                        [attr.aria-label]="chip.label + ' filtresini kaldır'"
                                        [disabled]="search.busy()"
                                        (click)="search.removeChip(chip.id)"
                                        data-testid="ai-search-chip-remove"
                                    >
                                        <i class="pi pi-times text-[0.6rem]" aria-hidden="true"></i>
                                    </button>
                                </span>
                            }
                        </div>
                        <span class="text-xs text-muted-color">Filtreyi kaldırmak yeniden arar; AI kredisi harcamaz.</span>
                    } @else {
                        <p class="ai-cnote m-0" data-testid="ai-search-empty-filter">
                            <i class="pi pi-question-circle" aria-hidden="true"></i><span>Cümleden bir filtre çıkaramadım. Tür, tarih, şikâyet, aşı ya da ilaç adıyla yeniden yazmayı deneyin.</span>
                        </p>
                    }
                    @for (note of s.interpretation?.unsupported ?? []; track note) {
                        <p class="ai-cnote m-0" data-testid="ai-search-unsupported"><i class="pi pi-info-circle" aria-hidden="true"></i><span>Filtreye çeviremedim: {{ note }}</span></p>
                    }
                    @for (note of droppedNotes(); track note) {
                        <p class="ai-cnote m-0" data-testid="ai-search-dropped"><i class="pi pi-filter-slash" aria-hidden="true"></i><span>Uygulanmadı: {{ note }}</span></p>
                    }
                </section>
            }

            @if (s.phase === 'searching') {
                <app-ai-state loadingText="Kayıtlar aranıyor…" />
            } @else if (s.phase === 'ready' && s.result; as r) {
                <section class="flex flex-col gap-2" aria-label="Sonuçlar" data-testid="ai-search-results">
                    <h3 class="m-0 text-xs font-bold uppercase tracking-wide text-muted-color">
                        {{ r.totalCount }} hasta <span class="font-semibold normal-case tracking-normal">· yalnız bu kliniğin kayıtlarında</span>
                    </h3>
                    @if (r.omittedTypesLabel; as omitted) {
                        <p class="ai-cnote m-0" data-testid="ai-search-omitted">
                            <i class="pi pi-lock" aria-hidden="true"></i><span>Görme yetkiniz olmadığı için <b>{{ omitted }}</b> kayıtları aranmadı.</span>
                        </p>
                    }
                    @if (r.truncated) {
                        <p class="ai-cnote m-0" data-testid="ai-search-truncated">
                            <i class="pi pi-history" aria-hidden="true"></i><span>Çok kayıt eşleşti; yalnız en yeni kayıtlar arandı. Filtreyi daraltmayı deneyin.</span>
                        </p>
                    }
                    @if (r.items.length === 0) {
                        <app-ai-state icon="pi-search" title="Uyan hasta yok" message="Bir filtreyi kaldırıp yeniden deneyebilirsiniz." />
                    } @else {
                        <ul class="m-0 p-0 list-none flex flex-col">
                            @for (item of r.items; track item.petId) {
                                <li class="py-2.5 border-b border-surface last:border-b-0" data-testid="ai-search-item">
                                    <div class="flex items-baseline gap-2 min-w-0">
                                        <a [routerLink]="['/panel/pets', item.petId]" class="font-semibold text-primary no-underline truncate">{{ item.name }}</a>
                                        <span class="text-xs text-muted-color shrink-0">{{ item.speciesName }}</span>
                                        @if (item.isDeceased) {
                                            <span class="text-xs font-medium text-muted-color border border-surface rounded-border px-1.5">Vefat</span>
                                        }
                                    </div>
                                    @if (item.detail || item.clientName) {
                                        <div class="text-xs text-muted-color mt-0.5">
                                            {{ item.detail }}{{ item.detail && item.clientName ? ' · ' : '' }}
                                            @if (item.clientName && item.clientId) {
                                                <a [routerLink]="['/panel/clients', item.clientId]" class="text-muted-color hover:text-primary">{{ item.clientName }}</a>
                                            }
                                        </div>
                                    }
                                    @if (item.matches.length) {
                                        <div class="flex flex-col gap-1 mt-1.5">
                                            @for (m of item.matches; track m.source.type + m.source.id) {
                                                <div class="flex items-center gap-1.5 min-w-0 text-xs">
                                                    <app-ai-source-link [source]="m.source" />
                                                    <span class="truncate" [class.text-muted-color]="!m.isOverdue">{{ m.text }}</span>
                                                    @if (m.isOverdue) {
                                                        <span class="shrink-0 font-semibold text-amber-700 dark:text-amber-400">gecikmiş</span>
                                                    }
                                                </div>
                                            }
                                        </div>
                                    }
                                </li>
                            }
                        </ul>
                        @if (r.items.length < r.totalCount) {
                            <button pButton type="button" size="small" class="p-button-text self-center" [loading]="s.loadingMore" (click)="search.loadMore()" data-testid="ai-search-more">
                                Daha fazla göster ({{ r.totalCount - r.items.length }})
                            </button>
                        }
                    }
                </section>
            }
        </div>
        <div class="flex items-center gap-2 px-4 py-3 border-t border-surface">
            <span class="flex-1 text-xs text-muted-color">Yapay zekâ yalnız cümlenizi filtreye çevirir; hasta kayıtlarını görmez.</span>
            @if (s.phase !== 'idle') {
                <button pButton type="button" size="small" class="p-button-outlined p-button-secondary" [disabled]="search.busy()" (click)="newSearch()" data-testid="ai-search-new"><i class="pi pi-refresh"></i>Yeni arama</button>
            }
        </div>
    `,
    styles: `
        .ai-cnote {
            display: flex;
            gap: 0.5rem;
            align-items: flex-start;
            padding: 0.5rem 0.75rem;
            font-size: 0.8572rem;
            color: var(--text-color-secondary);
            background: var(--p-content-hover-background);
            border: 1px solid var(--p-content-border-color);
            border-radius: var(--p-border-radius-md);
        }

        .ai-cnote > i {
            margin-top: 0.15rem;
            font-size: 0.8rem;
        }
    `
})
export class AiPetSearchComponent {
    protected readonly search = inject(AiPetSearchService);

    protected readonly examples = AI_PET_SEARCH_EXAMPLES;
    protected readonly queryInput = signal(this.search.state().query);

    constructor() {
        this.search.ensureSpeciesLoaded();
    }

    /** Yorumlamadaki ve aramadaki atılan değerler birlikte, tekrarsız. */
    protected droppedNotes(): string[] {
        const s = this.search.state();

        return [...new Set([...(s.interpretation?.dropped ?? []), ...(s.result?.dropped ?? [])])];
    }

    protected submit(): void {
        this.search.interpret(this.queryInput());
    }

    /** Enter gönderir, Shift+Enter satır ekler. */
    protected onEnter(event: Event): void {
        if (!(event as KeyboardEvent).shiftKey) {
            event.preventDefault();
            this.submit();
        }
    }

    protected newSearch(): void {
        this.search.reset();
        this.queryInput.set('');
    }
}
