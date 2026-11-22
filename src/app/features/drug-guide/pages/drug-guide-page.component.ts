import { Component, computed, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@/app/core/auth/auth.service';
import { PRODUCTS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { ActiveIngredientRef, DrugGuideSummaryVm, IngredientStockProductVm, LicensedProductSearchField, LicensedProductVm } from '@/app/entities/drug-guide/models/drug-guide.model';
import { DrugGuideService } from '@/app/entities/drug-guide/services/drug-guide.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { TrDatePipe } from '@/app/shared/pipes/tr-date.pipe';

const PAGE_SIZE = 20;

/**
 * İlaç rehberi (REF-001 Dilim 1–2, ADR-049): global ruhsatlı ürün kataloğunda ürün adı, etken madde ve ruhsat sahibine
 * göre arama; etken maddeye tıklayınca o maddeyi içeren ürünler ve stokta bu maddeyi içeren klinik ürünleri. Bilgi
 * ekranıdır: tanı, doz ve tedavi önermez (K6). Katalog boşken boş durum gösterilir.
 */
@Component({
    selector: 'app-drug-guide-page',
    standalone: true,
    imports: [FormsModule, RouterLink, ButtonModule, SelectModule, AppPageHeaderComponent, AppLoadingStateComponent, AppErrorStateComponent, AppEmptyStateComponent, SearchInputComponent, AppStatusTagComponent, TrDatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-page-header title="İlaç rehberi" description="Ruhsatlı veteriner ürünlerini ürün adı, etken madde ya da ruhsat sahibine göre arayın." />

        @if (summaryLoading()) {
            <app-loading-state message="Rehber yükleniyor…" />
        } @else if (summaryError()) {
            <div class="card"><app-error-state [detail]="summaryError()!" (retry)="loadSummary()" /></div>
        } @else if (summary()?.productCount === 0) {
            <div class="card" data-testid="drug-guide-empty">
                <app-empty-state iconClass="pi pi-book" message="İlaç rehberi henüz boş" hint="Ruhsatlı ürün listesi yüklendiğinde burada ürün adı, etken madde ve ruhsat sahibine göre arayabileceksiniz." />
            </div>
        } @else {
            <p class="text-sm text-muted-color mt-0 mb-4" role="note" data-testid="drug-guide-source-note">
                Bilgi Bakanlık ruhsat listesinden alınmıştır{{ summary()?.lastSyncedAtUtc ? ', ' + (summary()!.lastSyncedAtUtc | trDate) : '' }}. Esas metin ürünün onaylı Ürün Özellikleri Özeti'dir. Klinik karar hekime aittir.
            </p>

            <div class="card">
                <div class="flex flex-wrap gap-3 items-end mb-4">
                    <div class="grow min-w-60">
                        <label for="dg-search" class="block text-sm font-medium text-muted-color mb-2">Ara</label>
                        <app-search-input inputId="dg-search" placeholder="Ürün, etken madde ya da ruhsat sahibi" [(value)]="search" (searchRequested)="runSearch()" />
                    </div>
                    <div class="w-48">
                        <label for="dg-field" class="block text-sm font-medium text-muted-color mb-2">Aranan alan</label>
                        <p-select inputId="dg-field" [options]="fieldOptions" optionLabel="label" optionValue="value" [(ngModel)]="field" (onChange)="runSearch()" class="w-full" />
                    </div>
                </div>

                @if (ingredient(); as ing) {
                    <div class="flex flex-wrap items-center gap-2 mb-4" data-testid="drug-guide-ingredient-filter">
                        <span class="text-sm"
                            >Etken madde: <span class="font-semibold">{{ ing.name }}</span></span
                        >
                        <button pButton type="button" size="small" severity="secondary" [text]="true" (click)="clearIngredient()"><i class="p-button-icon pi pi-times"></i>Filtreyi kaldır</button>
                    </div>

                    @if (canReadStock) {
                        <section class="rounded-border border border-surface-200 dark:border-surface-700 p-3 mb-4" aria-labelledby="dg-stock-title" data-testid="drug-guide-stock">
                            <h6 id="dg-stock-title" class="m-0 mb-2">Stokta bu maddeyi içeren ürünler</h6>
                            @if (stockLoading()) {
                                <p class="m-0 text-sm text-muted-color">Yükleniyor…</p>
                            } @else if (stockError()) {
                                <p class="m-0 text-sm text-danger" role="alert">{{ stockError() }}</p>
                            } @else if (stock().length === 0) {
                                <p class="m-0 text-sm text-muted-color">Bu maddeyi içeren, rehbere bağlı ürün kartı yok. Ürün kartından rehber bağı kurabilirsiniz.</p>
                            } @else {
                                <ul class="list-none m-0 p-0 flex flex-col gap-1 text-sm">
                                    @for (s of stock(); track s.productId) {
                                        <li class="flex flex-wrap gap-x-3 items-center">
                                            <a [routerLink]="['/panel/products', s.productId]" class="font-medium">{{ s.productName }}</a>
                                            <span class="tabular-nums">{{ s.quantityOnHand }} {{ s.unit }}</span>
                                            @if (!s.isActive) {
                                                <app-status-tag label="Pasif" />
                                            }
                                            <span class="text-muted-color">{{ s.licensedProductName }}</span>
                                        </li>
                                    }
                                </ul>
                            }
                        </section>
                    }
                }

                @if (loading() && results().length === 0) {
                    <app-loading-state message="Aranıyor…" />
                } @else if (error()) {
                    <app-error-state [detail]="error()!" (retry)="runSearch()" />
                } @else if (results().length === 0) {
                    <app-empty-state iconClass="pi pi-search" message="Sonuç yok" hint="Farklı bir yazım ya da alan deneyin." />
                } @else {
                    <p class="text-sm text-muted-color mt-0 mb-2">{{ total() }} ürün</p>
                    <ul class="list-none m-0 p-0 flex flex-col" data-testid="drug-guide-results">
                        @for (p of results(); track p.id) {
                            <li class="py-3 border-t border-surface-200 dark:border-surface-700 first:border-t-0" data-testid="drug-guide-result">
                                <div class="flex flex-wrap items-center gap-2">
                                    <span class="font-semibold">{{ p.name }}</span>
                                    @if (!p.isListedInSource) {
                                        <app-status-tag label="Ruhsat listesinde artık yok" severity="warn" />
                                    }
                                </div>
                                <div class="mt-1 text-sm flex flex-wrap gap-x-1 gap-y-1 items-center">
                                    <span class="text-muted-color">Etken madde:</span>
                                    @for (a of p.activeIngredients; track a.id; let last = $last) {
                                        <button type="button" class="p-0 border-0 bg-transparent text-primary cursor-pointer hover:underline underline-offset-2" [attr.aria-label]="a.name + ' içeren ürünleri göster'" (click)="selectIngredient(a)">
                                            {{ a.name }}</button
                                        >{{ last ? '' : ',' }}
                                    }
                                </div>
                                <dl class="mt-1 mb-0 text-sm grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                                    @if (p.targetSpecies.length > 0) {
                                        <dt class="text-muted-color">Hedef tür</dt>
                                        <dd class="m-0">{{ p.targetSpecies.join(', ') }}</dd>
                                    }
                                    <dt class="text-muted-color">Ruhsat sahibi</dt>
                                    <dd class="m-0">{{ p.licenseHolder }}</dd>
                                    @if (p.licenseNumber) {
                                        <dt class="text-muted-color">Ruhsat no</dt>
                                        <dd class="m-0 tabular-nums">{{ p.licenseNumber }}</dd>
                                    }
                                </dl>
                                @if (p.spcUrl) {
                                    <a [href]="p.spcUrl" target="_blank" rel="noopener noreferrer" class="inline-block mt-1 text-sm">Ürün Özellikleri Özeti <i class="pi pi-external-link text-xs" aria-hidden="true"></i></a>
                                }
                            </li>
                        }
                    </ul>
                    @if (hasMore()) {
                        <div class="mt-3">
                            <button pButton type="button" severity="secondary" [outlined]="true" [disabled]="loading()" (click)="loadMore()">
                                <i class="p-button-icon" [class]="loading() ? 'pi pi-spin pi-spinner' : 'pi pi-angle-down'"></i>Daha fazla göster
                            </button>
                        </div>
                    }
                }
            </div>
        }
    `
})
export class DrugGuidePageComponent implements OnInit {
    private readonly service = inject(DrugGuideService);
    readonly canReadStock = inject(AuthService).hasOperationClaim(PRODUCTS_READ_CLAIM);

    readonly fieldOptions: { label: string; value: LicensedProductSearchField }[] = [
        { label: 'Tümü', value: 'All' },
        { label: 'Ürün adı', value: 'Product' },
        { label: 'Etken madde', value: 'Ingredient' },
        { label: 'Ruhsat sahibi', value: 'Holder' }
    ];

    readonly summary = signal<DrugGuideSummaryVm | null>(null);
    readonly summaryLoading = signal(true);
    readonly summaryError = signal<string | null>(null);

    search = '';
    field: LicensedProductSearchField = 'All';
    readonly ingredient = signal<ActiveIngredientRef | null>(null);

    readonly results = signal<LicensedProductVm[]>([]);
    readonly total = signal(0);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    private page = 1;
    private searchSeq = 0;
    readonly hasMore = computed(() => this.results().length < this.total());

    readonly stock = signal<IngredientStockProductVm[]>([]);
    readonly stockLoading = signal(false);
    readonly stockError = signal<string | null>(null);

    ngOnInit(): void {
        this.loadSummary();
    }

    loadSummary(): void {
        this.summaryLoading.set(true);
        this.summaryError.set(null);
        this.service.getSummary().subscribe({
            next: (s) => {
                this.summary.set(s);
                this.summaryLoading.set(false);

                if (s.productCount > 0) {
                    this.runSearch();
                }
            },
            error: (e: Error) => {
                this.summaryError.set(e.message);
                this.summaryLoading.set(false);
            }
        });
    }

    runSearch(): void {
        this.page = 1;
        this.fetch(false);
    }

    loadMore(): void {
        this.page += 1;
        this.fetch(true);
    }

    selectIngredient(ingredient: ActiveIngredientRef): void {
        this.ingredient.set(ingredient);
        this.runSearch();
        this.loadStock(ingredient.id);
    }

    clearIngredient(): void {
        this.ingredient.set(null);
        this.stock.set([]);
        this.runSearch();
    }

    /** Geç gelen önceki aramanın sonucu yazılmaz. */
    private fetch(append: boolean): void {
        const seq = ++this.searchSeq;

        this.loading.set(true);
        this.error.set(null);
        this.service.searchProducts({ search: this.search, field: this.field, activeIngredientId: this.ingredient()?.id ?? null, page: this.page, pageSize: PAGE_SIZE }).subscribe({
            next: (r) => {
                if (seq !== this.searchSeq) {
                    return;
                }

                this.results.set(append ? [...this.results(), ...r.items] : r.items);
                this.total.set(r.totalItems);
                this.loading.set(false);
            },
            error: (e: Error) => {
                if (seq !== this.searchSeq) {
                    return;
                }

                this.error.set(e.message);
                this.loading.set(false);
            }
        });
    }

    private loadStock(ingredientId: string): void {
        if (!this.canReadStock) {
            return;
        }

        this.stockLoading.set(true);
        this.stockError.set(null);
        this.service.getIngredientStockProducts(ingredientId).subscribe({
            next: (rows) => {
                if (this.ingredient()?.id === ingredientId) {
                    this.stock.set(rows);
                    this.stockLoading.set(false);
                }
            },
            error: (e: Error) => {
                if (this.ingredient()?.id === ingredientId) {
                    this.stockError.set(e.message);
                    this.stockLoading.set(false);
                }
            }
        });
    }
}
