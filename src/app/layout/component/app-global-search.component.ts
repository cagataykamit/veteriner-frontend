import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, ElementRef, afterNextRender, inject, Injector, signal, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import { catchError, debounceTime, of, Subject, switchMap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { CLIENT_SEARCH_MIN_LENGTH, type ClientSearchResultVm } from '@/app/entities/client/services/client-search.service';
import { GlobalSearchPetVm, GlobalSearchResultVm, GlobalSearchService } from '@/app/features/patients/services/global-search.service';
import { patientSearchEntryParams } from '@/app/features/patients/services/patient-search.service';
import {
    RecentlyViewedEntry,
    RecentlyViewedKind,
    RecentlyViewedService,
    recentlyViewedKindIcon,
    recentlyViewedKindPlural,
    recentlyViewedRoute,
    recentlyViewedSubtitle
} from '@/app/entities/patient/services/recently-viewed.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { canShowQuickClientPetRegistration } from '@/app/shared/forms/quick-create/quick-client-pet-create-visibility.utils';

type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Listedeki satır: son görüntülenen kayıt ya da arama sonucu, aynı görünümle. */
interface SearchOption {
    readonly key: string;
    readonly kind: RecentlyViewedKind;
    readonly route: readonly string[];
    readonly title: string;
    /** Başlığın yanında soluk yazılır (hastada tür ve ırk); boş olabilir. */
    readonly detail: string;
    readonly subtitle: string;
}

interface SearchGroup {
    readonly kind: RecentlyViewedKind;
    readonly label: string;
    /** Grubun ilk satırının klavye sırasındaki yeri. */
    readonly start: number;
    readonly options: readonly SearchOption[];
}

const LISTBOX_ID = 'global-search-listbox';
const EDITABLE_TARGET = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';
const PATIENTS_ROUTE = '/panel/patients';

/** Grupların sırası; tür içinde sıra korunur (son görüntülenenlerde en yeni önce). */
const KIND_ORDER: readonly RecentlyViewedKind[] = ['pet', 'client', 'examination'];

/** Tür simgesinin zemini ve rengi. */
const KIND_TONE: Readonly<Record<RecentlyViewedKind, string>> = {
    pet: 'text-primary bg-primary-50 dark:bg-primary-950/40',
    client: 'text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-950/40',
    examination: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40'
};

/**
 * Üst çubuk global arama: son görüntülenen kayıtları (sorgu boşken, {@link RecentlyViewedService}) ve arama sonuçlarını
 * türe göre gruplar (Hastalar · Müşteriler · Muayeneler); seçilen kaydın detay sayfasına gider. Müşteri satırında telefon,
 * hasta satırında sahip ve telefon aynı adlı kayıtları ayırır. Sonuç yoksa "Yeni kayıt", alt şeritte hızlı işlemler için
 * Ara sekmesine geçiş vardır (aranan metin taşınır). Ctrl/Cmd+K veya `/` ile açılır, Esc kapatır (PrimeNG Dialog).
 * Okuma izni olmayan sonuç türü sorgulanmaz.
 */
@Component({
    selector: 'app-global-search',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, DialogModule, IconFieldModule, InputIconModule, InputTextModule],
    host: { '(document:keydown)': 'onDocumentKeydown($event)' },
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (enabled) {
            <button type="button" class="layout-topbar-action layout-topbar-search-trigger" aria-label="Ara" aria-keyshortcuts="Control+K /" title="Ara (Ctrl+K veya /)" (click)="open()">
                <i class="pi pi-search" aria-hidden="true"></i>
                <span class="layout-topbar-search-label">Ara…</span>
                <kbd class="layout-topbar-search-key" aria-hidden="true">Ctrl K</kbd>
            </button>
            <p-dialog
                header="Müşteri ve hasta ara"
                position="top"
                appendTo="body"
                styleClass="global-search-dialog"
                [modal]="true"
                [dismissableMask]="true"
                [draggable]="false"
                [(visible)]="visible"
                [style]="{ width: 'min(40rem, 95vw)' }"
                (onShow)="focusInput()"
                (onHide)="reset()"
            >
                <p-iconfield>
                    <p-inputicon class="pi pi-search" />
                    <input
                        #searchInput
                        pInputText
                        pSize="large"
                        type="search"
                        class="w-full"
                        role="combobox"
                        autocomplete="off"
                        aria-label="Müşteri veya hasta ara"
                        aria-autocomplete="list"
                        [attr.aria-expanded]="options().length > 0"
                        [attr.aria-controls]="listboxId"
                        [attr.aria-activedescendant]="activeOptionId()"
                        placeholder="Ad, telefon, hasta adı veya mikroçip"
                        [value]="query()"
                        (input)="onInput($any($event.target).value)"
                        (keydown)="onInputKeydown($event)"
                    />
                </p-iconfield>

                <div class="mt-2" aria-live="polite">
                    @switch (status()) {
                        @case ('idle') {
                            @if (term()) {
                                <p class="m-0 px-1 py-3 text-sm text-muted-color">En az {{ minLength }} karakter yazın.</p>
                            } @else if (!showRecent()) {
                                <p class="m-0 px-1 py-6 text-center text-sm text-muted-color" data-testid="global-search-first-use">
                                    <i class="pi pi-search block text-2xl mb-2 opacity-50" aria-hidden="true"></i>Ad, telefon, hasta adı veya mikroçip yazın.<br />Açtığınız kayıtlar burada listelenir.
                                </p>
                            }
                        }
                        @case ('loading') {
                            <p class="m-0 px-1 py-3 text-sm text-muted-color"><i class="pi pi-spin pi-spinner mr-2" aria-hidden="true"></i>Aranıyor…</p>
                        }
                        @case ('error') {
                            <p class="m-0 px-1 py-3 text-danger" role="alert">Arama yapılamadı. Bağlantınızı kontrol edip tekrar deneyin.</p>
                        }
                        @case ('ready') {
                            @if (result(); as r) {
                                @if (r.failedKinds.length) {
                                    <p class="m-0 px-1 pt-2 text-sm text-danger" role="alert">{{ failedMessage(r) }}</p>
                                }
                                @if (options().length === 0 && !r.failedKinds.length) {
                                    <div class="px-1 py-5 text-center" data-testid="global-search-no-result">
                                        <p class="m-0 text-sm text-muted-color">"{{ term() }}" için müşteri veya hasta bulunamadı.</p>
                                        @if (canRegister()) {
                                            <button pButton type="button" size="small" class="mt-3" (click)="register()"><i class="p-button-icon pi pi-user-plus"></i>{{ copy.newClientPetRegistration }}</button>
                                        }
                                    </div>
                                }
                            }
                        }
                    }

                    @if (groups().length) {
                        @if (showRecent()) {
                            <!-- Listenin ne olduğunu söyler: grup başlıklarının üstünde, koyu yazı ve simgeyle ayrışır; erişilebilir ad listbox'ta. -->
                            <div class="layout-topbar-panel-group flex items-center gap-2 px-1! pt-2! pb-1! text-color!" aria-hidden="true" data-testid="global-search-recent-heading">
                                <i class="pi pi-history text-muted-color" aria-hidden="true"></i>Son görüntülenenler
                            </div>
                        }
                        <div [id]="listboxId" role="listbox" [attr.aria-label]="showRecent() ? 'Son görüntülenenler' : 'Arama sonuçları'" [attr.data-testid]="showRecent() ? 'recently-viewed' : null">
                            @for (g of groups(); track g.kind) {
                                <div role="group" [attr.aria-labelledby]="'global-search-group-' + g.kind">
                                    <div [id]="'global-search-group-' + g.kind" class="layout-topbar-panel-group px-1! pt-2!">{{ g.label }}</div>
                                    @for (o of g.options; track o.key; let i = $index) {
                                        <a
                                            role="option"
                                            tabindex="-1"
                                            class="global-search-option"
                                            [id]="optionId(g.start + i)"
                                            [attr.aria-selected]="activeIndex() === g.start + i"
                                            [class.is-active]="activeIndex() === g.start + i"
                                            [routerLink]="o.route"
                                            (click)="close()"
                                            (mousemove)="activeIndex.set(g.start + i)"
                                        >
                                            <span class="global-search-kind" [class]="kindTone[o.kind]" aria-hidden="true"><i class="pi {{ kindIcon(o.kind) }}"></i></span>
                                            <span class="flex-1 min-w-0">
                                                <span class="font-medium">{{ o.title }}</span>
                                                @if (o.detail) {
                                                    <span class="text-muted-color"> · {{ o.detail }}</span>
                                                }
                                                @if (o.subtitle) {
                                                    <span class="block text-sm text-muted-color">{{ o.subtitle }}</span>
                                                }
                                            </span>
                                        </a>
                                    }
                                </div>
                            }
                        </div>
                    }
                </div>

                <ng-template #footer>
                    <div class="global-search-foot">
                        <span><kbd>↑↓</kbd> gez</span>
                        <span><kbd>Enter</kbd> aç</span>
                        <a class="ml-auto no-underline text-muted-color" data-testid="global-search-patients-link" [routerLink]="patientsRoute" [queryParams]="patientsQuery()" (click)="close()">Hızlı işlemler için <span class="text-primary font-medium">Ara sekmesi →</span></a>
                    </div>
                </ng-template>
            </p-dialog>
        }
    `
})
export class AppGlobalSearch {
    protected readonly listboxId = LISTBOX_ID;
    protected readonly minLength = CLIENT_SEARCH_MIN_LENGTH;
    protected readonly patientsRoute = PATIENTS_ROUTE;
    protected readonly copy = PANEL_COPY;
    protected readonly kindTone = KIND_TONE;
    protected readonly kindIcon = recentlyViewedKindIcon;

    private readonly search = inject(GlobalSearchService);
    private readonly recentlyViewed = inject(RecentlyViewedService);
    private readonly auth = inject(AuthService);
    private readonly ro = inject(TenantReadOnlyContextService);
    private readonly router = inject(Router);
    private readonly injector = inject(Injector);
    private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

    protected readonly enabled = this.search.canSearch();
    protected readonly visible = signal(false);
    protected readonly query = signal('');
    protected readonly term = computed(() => this.query().trim());
    protected readonly status = signal<SearchStatus>('idle');
    protected readonly result = signal<GlobalSearchResultVm | null>(null);
    protected readonly activeIndex = signal(0);

    /** Pencere açılınca okunur; sorgu boşken sonuç yerine gösterilir. */
    protected readonly recent = signal<RecentlyViewedEntry[]>([]);
    protected readonly showRecent = computed(() => this.status() === 'idle' && this.term() === '' && this.recent().length > 0);

    protected readonly groups = computed<SearchGroup[]>(() => {
        if (this.showRecent()) {
            return groupByKind(this.recent().map(recentOption));
        }

        const r = this.result();

        return this.status() === 'ready' && r ? groupByKind([...r.pets.map(petOption), ...r.clients.map(clientOption)]) : [];
    });
    /** Klavye gezintisi için gruplar görünen sırayla tek dizide. */
    protected readonly options = computed(() => this.groups().flatMap((g) => g.options));
    protected readonly activeOptionId = computed(() => (this.options()[this.activeIndex()] ? this.optionId(this.activeIndex()) : null));

    /** Ara sekmesine geçişte yeterince uzun sorgu taşınır, orada aynı arama yapılır. */
    protected readonly patientsQuery = computed(() => patientSearchEntryParams({ term: this.term().length >= this.minLength ? this.term() : '', register: false }));

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

    protected canRegister(): boolean {
        return canShowQuickClientPetRegistration(this.auth, this.ro);
    }

    protected open(): void {
        this.recent.set(this.recentlyViewed.list());
        this.activeIndex.set(0);
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

    /** Yeni kayıt Ara sekmesinde açılır; aranan metin formu önceden doldurur. */
    protected register(): void {
        const queryParams = patientSearchEntryParams({ term: this.term(), register: true });

        this.close();
        void this.router.navigate([PATIENTS_ROUTE], { queryParams });
    }

    protected onInput(value: string): void {
        this.query.set(value);
        const term = this.term();

        if (term.length < this.minLength) {
            this.result.set(null);
            this.status.set('idle');
            this.activeIndex.set(0);
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

function groupByKind(options: SearchOption[]): SearchGroup[] {
    const groups: SearchGroup[] = [];
    let start = 0;

    for (const kind of KIND_ORDER) {
        const items = options.filter((o) => o.kind === kind);

        if (items.length) {
            groups.push({ kind, label: recentlyViewedKindPlural(kind), start, options: items });
            start += items.length;
        }
    }

    return groups;
}

function recentOption(e: RecentlyViewedEntry): SearchOption {
    return { key: `${e.kind}:${e.id}`, kind: e.kind, route: recentlyViewedRoute(e), title: e.title, detail: '', subtitle: e.subtitle };
}

function petOption(p: GlobalSearchPetVm): SearchOption {
    return {
        key: `pet:${p.id}`,
        kind: 'pet',
        route: recentlyViewedRoute({ kind: 'pet', id: p.id }),
        title: p.name,
        detail: p.summary,
        subtitle: recentlyViewedSubtitle(p.ownerName && `Sahip: ${p.ownerName}`, p.ownerPhone, p.microchip && `Mikroçip: ${p.microchip}`)
    };
}

function clientOption(c: ClientSearchResultVm): SearchOption {
    return {
        key: `client:${c.id}`,
        kind: 'client',
        route: recentlyViewedRoute({ kind: 'client', id: c.id }),
        title: c.fullName,
        detail: '',
        subtitle: recentlyViewedSubtitle(c.phone, c.petNames.length ? `Hastalar: ${c.petNames.join(', ')}` : '')
    };
}
