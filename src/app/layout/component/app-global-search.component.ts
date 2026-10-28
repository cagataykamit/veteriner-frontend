import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, ElementRef, afterNextRender, inject, Injector, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import { catchError, debounceTime, of, Subject, switchMap } from 'rxjs';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { CLIENT_SEARCH_MIN_LENGTH } from '@/app/entities/client/services/client-search.service';
import { GlobalSearchResultVm, GlobalSearchService } from '@/app/features/patients/services/global-search.service';

type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';

interface SearchOption {
    readonly id: string;
    readonly route: readonly string[];
}

const LISTBOX_ID = 'global-search-listbox';
const EDITABLE_TARGET = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

/**
 * Üst çubuk global arama: müşteri ve hayvanları gruplu listeler, seçilen kaydın detay sayfasına gider.
 * Ctrl/Cmd+K veya `/` ile açılır, Esc kapatır (PrimeNG Dialog). Okuma izni olmayan sonuç türü sorgulanmaz.
 */
@Component({
    selector: 'app-global-search',
    standalone: true,
    imports: [CommonModule, RouterModule, DialogModule, InputTextModule],
    host: { '(document:keydown)': 'onDocumentKeydown($event)' },
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (enabled) {
            <button type="button" class="layout-topbar-action layout-topbar-search-trigger" aria-label="Ara" aria-keyshortcuts="Control+K /" title="Ara (Ctrl+K veya /)" (click)="open()">
                <i class="pi pi-search" aria-hidden="true"></i>
                <span class="layout-topbar-search-label">Ara…</span>
                <kbd class="layout-topbar-search-key" aria-hidden="true">Ctrl K</kbd>
            </button>
            <p-dialog header="Müşteri ve hasta ara" position="top" appendTo="body" [modal]="true" [dismissableMask]="true" [draggable]="false" [(visible)]="visible" [style]="{ width: 'min(40rem, 95vw)' }" (onShow)="focusInput()" (onHide)="reset()">
                <input
                    #searchInput
                    pInputText
                    type="search"
                    class="w-full"
                    role="combobox"
                    autocomplete="off"
                    aria-label="Müşteri veya hasta ara"
                    aria-autocomplete="list"
                    [attr.aria-expanded]="options().length > 0"
                    [attr.aria-controls]="listboxId"
                    [attr.aria-activedescendant]="activeOptionId()"
                    placeholder="Ad, telefon, hasta adı veya mikroçip ile arayın"
                    [value]="query()"
                    (input)="onInput($any($event.target).value)"
                    (keydown)="onInputKeydown($event)"
                />

                <div class="mt-3" aria-live="polite">
                    @switch (status()) {
                        @case ('idle') {
                            <p class="m-0 text-sm text-muted-color">En az {{ minLength }} karakter yazın.</p>
                        }
                        @case ('loading') {
                            <p class="m-0 text-sm text-muted-color"><i class="pi pi-spin pi-spinner mr-2" aria-hidden="true"></i>Aranıyor…</p>
                        }
                        @case ('error') {
                            <p class="m-0 text-red-500" role="alert">Arama yapılamadı. Bağlantınızı kontrol edip tekrar deneyin.</p>
                        }
                        @case ('ready') {
                            @if (result(); as r) {
                                @if (r.failedKinds.length) {
                                    <p class="m-0 mb-2 text-sm text-red-500" role="alert">{{ failedMessage(r) }}</p>
                                }
                                @if (options().length === 0 && !r.failedKinds.length) {
                                    <p class="m-0 text-sm text-muted-color">Sonuç bulunamadı.</p>
                                }
                                @if (options().length) {
                                    <div [id]="listboxId" role="listbox" aria-label="Arama sonuçları" class="flex flex-col gap-3">
                                        @if (r.clients.length) {
                                            <div role="group" aria-labelledby="global-search-clients">
                                                <div id="global-search-clients" class="text-xs font-bold uppercase text-muted-color mb-1">Müşteriler</div>
                                                @for (c of r.clients; track c.id; let i = $index) {
                                                    <a
                                                        role="option"
                                                        tabindex="-1"
                                                        class="global-search-option"
                                                        [id]="optionId(i)"
                                                        [attr.aria-selected]="activeIndex() === i"
                                                        [class.is-active]="activeIndex() === i"
                                                        [routerLink]="['/panel/clients', c.id]"
                                                        (click)="close()"
                                                        (mousemove)="activeIndex.set(i)"
                                                    >
                                                        <span class="font-medium">{{ c.fullName }}</span>
                                                        <span class="text-sm text-muted-color">
                                                            {{ c.phone }}
                                                            @if (c.petNames.length) {
                                                                · Hastalar: {{ c.petNames.join(', ') }}
                                                            }
                                                        </span>
                                                    </a>
                                                }
                                            </div>
                                        }
                                        @if (r.pets.length) {
                                            <div role="group" aria-labelledby="global-search-pets">
                                                <div id="global-search-pets" class="text-xs font-bold uppercase text-muted-color mb-1">Hastalar</div>
                                                @for (p of r.pets; track p.id; let i = $index) {
                                                    <a
                                                        role="option"
                                                        tabindex="-1"
                                                        class="global-search-option"
                                                        [id]="optionId(r.clients.length + i)"
                                                        [attr.aria-selected]="activeIndex() === r.clients.length + i"
                                                        [class.is-active]="activeIndex() === r.clients.length + i"
                                                        [routerLink]="['/panel/pets', p.id]"
                                                        (click)="close()"
                                                        (mousemove)="activeIndex.set(r.clients.length + i)"
                                                    >
                                                        <span class="font-medium">
                                                            {{ p.name }}
                                                            @if (p.summary) {
                                                                <span class="font-normal text-muted-color"> · {{ p.summary }}</span>
                                                            }
                                                        </span>
                                                        @if (p.ownerName || p.ownerPhone || p.microchip) {
                                                            <span class="text-sm text-muted-color">
                                                                @if (p.ownerName) {
                                                                    Sahip: {{ p.ownerName }}
                                                                }
                                                                @if (p.ownerPhone) {
                                                                    · {{ p.ownerPhone }}
                                                                }
                                                                @if (p.microchip) {
                                                                    · Mikroçip: {{ p.microchip }}
                                                                }
                                                            </span>
                                                        }
                                                    </a>
                                                }
                                            </div>
                                        }
                                    </div>
                                }
                            }
                        }
                    }
                </div>
            </p-dialog>
        }
    `
})
export class AppGlobalSearch {
    protected readonly listboxId = LISTBOX_ID;
    protected readonly minLength = CLIENT_SEARCH_MIN_LENGTH;

    private readonly search = inject(GlobalSearchService);
    private readonly router = inject(Router);
    private readonly injector = inject(Injector);
    private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

    protected readonly enabled = this.search.canSearch();
    protected readonly visible = signal(false);
    protected readonly query = signal('');
    protected readonly status = signal<SearchStatus>('idle');
    protected readonly result = signal<GlobalSearchResultVm | null>(null);
    protected readonly activeIndex = signal(0);

    /** Klavye gezintisi için müşteriler ve hayvanlar tek sırada. */
    protected readonly options = computed<SearchOption[]>(() => {
        const r = this.result();

        return r ? [...r.clients.map((c, i) => ({ id: this.optionId(i), route: ['/panel/clients', c.id] })), ...r.pets.map((p, i) => ({ id: this.optionId(r.clients.length + i), route: ['/panel/pets', p.id] }))] : [];
    });
    protected readonly activeOptionId = computed(() => this.options()[this.activeIndex()]?.id ?? null);

    private readonly term$ = new Subject<string>();

    constructor() {
        this.term$
            .pipe(
                debounceTime(300),
                // Boş terim: pencere kapandı veya yazı kısaldı; bekleyen arama `switchMap` ile iptal edilir.
                switchMap((term) => (term ? this.search.search(term).pipe(catchError(() => of(null))) : of(undefined))),
                takeUntilDestroyed(inject(DestroyRef))
            )
            .subscribe((result) => {
                if (result === undefined) {
                    return;
                }

                this.result.set(result);
                this.activeIndex.set(0);
                this.status.set(result ? 'ready' : 'error');
            });
    }

    protected optionId(index: number): string {
        return `${LISTBOX_ID}-option-${index}`;
    }

    protected open(): void {
        this.visible.set(true);
        // Açılış animasyonu (onShow) bitmeden yazılan ilk karakterler kaybolmasın diye hemen odaklanır.
        afterNextRender(() => this.focusInput(), { injector: this.injector });
    }

    protected close(): void {
        this.visible.set(false);
    }

    protected focusInput(): void {
        this.searchInput()?.nativeElement.focus();
    }

    protected reset(): void {
        this.query.set('');
        this.result.set(null);
        this.status.set('idle');
        this.activeIndex.set(0);
        this.term$.next('');
    }

    protected onInput(value: string): void {
        this.query.set(value);
        const term = value.trim();

        if (term.length < this.minLength) {
            this.result.set(null);
            this.status.set('idle');
            this.term$.next('');

            return;
        }

        this.status.set('loading');
        this.term$.next(term);
    }

    protected onInputKeydown(event: KeyboardEvent): void {
        const count = this.options().length;

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();

            if (count) {
                const step = event.key === 'ArrowDown' ? 1 : -1;

                this.activeIndex.set((this.activeIndex() + step + count) % count);
                document.getElementById(this.activeOptionId() ?? '')?.scrollIntoView({ block: 'nearest' });
            }
        } else if (event.key === 'Enter') {
            const option = this.options()[this.activeIndex()];

            if (option) {
                event.preventDefault();
                this.close();
                void this.router.navigate([...option.route]);
            }
        }
    }

    protected failedMessage(r: GlobalSearchResultVm): string {
        const names = r.failedKinds.map((kind) => (kind === 'clients' ? 'Müşteri' : 'Hasta'));

        return `${names.join(' ve ')} araması yapılamadı.`;
    }

    protected onDocumentKeydown(event: KeyboardEvent): void {
        if (!this.enabled || this.visible()) {
            return;
        }

        const ctrlK = (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k';
        const slash = event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !(event.target as Element | null)?.closest?.(EDITABLE_TARGET);

        if (ctrlK || slash) {
            event.preventDefault();
            this.open();
        }
    }
}
