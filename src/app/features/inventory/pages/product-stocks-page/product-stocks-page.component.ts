import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Paginator } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/types/paginator';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import { mapProductCategoryListItemVmToSelectOption } from '@/app/features/inventory/data/product-category.mapper';
import type { ProductStockVm } from '@/app/features/inventory/models/product-stock-vm.model';
import { ProductCategoryService } from '@/app/features/inventory/services/product-category.service';
import { ProductStockService } from '@/app/features/inventory/services/product-stock.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { PRODUCT_CATEGORIES_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';

type StocksListState = {
    search: string;
    lowStockFilter: string;
    productCategoryId: string;
    page: number;
    pageSize: number;
};

const PRODUCT_STOCKS_LIST_STATE_KEY = 'panel:inventory:product-stocks:listState';

@Component({
    selector: 'app-product-stocks-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        TableModule,
        Paginator,
        ButtonModule,
        InputTextModule,
        SelectModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    template: `
        <app-page-header
            title="Stok durumu"
            subtitle="Ürün ve Stok"
            description="Aktif klinik bağlamındaki ürün stokları."
        />

        <div class="card">
            @if (loading()) {
                <app-loading-state message="Stok listesi yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else {
                <div class="flex flex-col gap-4">
                    <div class="pb-3 border-b border-surface-200 dark:border-surface-700">
                        <div class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3 mb-3">
                            <div class="min-w-0">
                                <h5 class="m-0">Stoklar</h5>
                                <p class="text-muted-color text-sm m-0 mt-1">{{ activeClinicContextHint() }}</p>
                                @if (totalItems() > 0) {
                                    <span class="text-sm text-muted-color whitespace-nowrap">{{ totalItems() }} kayıt</span>
                                }
                            </div>
                            <div class="flex flex-col sm:flex-row gap-3 sm:items-end w-full xl:w-auto xl:min-w-[22rem] xl:max-w-2xl">
                                <div
                                    class="flex-1 min-w-0 rounded-lg border p-2 transition-colors"
                                    [ngClass]="
                                        isSearchActive()
                                            ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
                                            : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900'
                                    "
                                >
                                    <label
                                        for="stockSearch"
                                        class="flex items-center gap-2 text-xs font-medium mb-1"
                                        [ngClass]="isSearchActive() ? 'text-primary-800 dark:text-primary-200' : 'text-muted-color'"
                                    >
                                        Arama
                                    </label>
                                    <input
                                        pInputText
                                        id="stockSearch"
                                        class="w-full"
                                        [(ngModel)]="searchInput"
                                        placeholder="Ürün adı, SKU…"
                                        (keyup.enter)="applyFilters()"
                                    />
                                </div>
                                <div class="flex flex-wrap gap-2 shrink-0">
                                    <p-button [label]="copy.buttonSearch" icon="pi pi-search" (onClick)="applyFilters()" [disabled]="loading()" />
                                    <p-button
                                        [label]="copy.buttonClear"
                                        icon="pi pi-times"
                                        severity="secondary"
                                        (onClick)="resetFilters()"
                                        [disabled]="loading()"
                                    />
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-12 gap-3 items-end">
                            @if (canReadCategories && categoryOptions().length > 0) {
                                <div
                                    class="col-span-12 md:col-span-6 lg:col-span-4 rounded-lg border p-2 transition-colors"
                                    [ngClass]="
                                        isCategoryFilterApplied()
                                            ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
                                            : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900'
                                    "
                                >
                                    <span id="lblStockCat" class="flex items-center gap-2 text-xs font-medium mb-1 text-muted-color">Kategori</span>
                                    <p-select
                                        ariaLabelledBy="lblStockCat"
                                        inputId="stockCategoryFilter"
                                        [options]="categoryOptions()"
                                        [(ngModel)]="categoryFilterInput"
                                        optionLabel="label"
                                        optionValue="value"
                                        placeholder="Tüm kategoriler"
                                        styleClass="w-full"
                                        [filter]="true"
                                        filterBy="label"
                                        [showClear]="true"
                                    />
                                </div>
                            }
                            <div
                                class="col-span-12 md:col-span-6 lg:col-span-4 rounded-lg border p-2 transition-colors"
                                [ngClass]="
                                    isLowStockFilterApplied()
                                        ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
                                        : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900'
                                "
                            >
                                <span id="lblStockLow" class="flex items-center gap-2 text-xs font-medium mb-1 text-muted-color">Düşük stok</span>
                                <p-select
                                    ariaLabelledBy="lblStockLow"
                                    inputId="stockLowFilter"
                                    [options]="lowStockFilterOptions"
                                    [(ngModel)]="lowStockFilterInput"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Tümü"
                                    styleClass="w-full"
                                />
                            </div>
                        </div>
                    </div>

                    @if (displayedRows().length === 0) {
                        <app-empty-state [message]="emptyListMessage()" [hint]="emptyListHint()" />
                    } @else {
                        <div class="hidden lg:block overflow-x-auto">
                            <p-table
                                [value]="displayedRows()"
                                [paginator]="true"
                                [rows]="pageSize()"
                                [totalRecords]="totalItems()"
                                [lazy]="true"
                                [first]="first()"
                                (onLazyLoad)="onTableLazyLoad($event)"
                                [tableStyle]="{ 'min-width': '56rem' }"
                                [showCurrentPageReport]="true"
                                currentPageReportTemplate="{first} - {last} / {totalRecords}"
                            >
                                <ng-template #header>
                                    <tr>
                                        <th>Ürün</th>
                                        <th>SKU</th>
                                        <th>Kategori</th>
                                        <th>Klinik</th>
                                        <th class="text-right">Eldeki stok</th>
                                        <th class="text-right">Minimum</th>
                                        <th>Durum</th>
                                        <th>Son güncelleme</th>
                                        <th style="min-width: 6rem"></th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-row>
                                    <tr>
                                        <td class="font-medium max-w-[14rem] break-words">{{ row.productName }}</td>
                                        <td>{{ row.productSkuText }}</td>
                                        <td>{{ row.productCategoryName }}</td>
                                        <td>{{ row.clinicName }}</td>
                                        <td class="text-right whitespace-nowrap">{{ row.quantityText }}</td>
                                        <td class="text-right whitespace-nowrap">{{ row.minimumStockLevelText }}</td>
                                        <td>
                                            <app-status-tag [label]="row.statusLabel" [severity]="row.statusSeverity" />
                                        </td>
                                        <td class="text-muted-color text-sm whitespace-nowrap">{{ row.updatedAtText }}</td>
                                        <td>
                                            @if (row.productId) {
                                                <a
                                                    [routerLink]="['/panel/products', row.productId]"
                                                    class="text-primary font-medium no-underline text-sm"
                                                    >Detay</a
                                                >
                                            }
                                        </td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>

                        <div class="lg:hidden space-y-3">
                            @for (row of displayedRows(); track row.id) {
                                <div
                                    class="rounded-border border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4 shadow-sm"
                                >
                                    <div class="text-base font-semibold text-surface-900 dark:text-surface-0 mb-1 break-words">{{ row.productName }}</div>
                                    <div class="text-sm text-muted-color mb-2">SKU: {{ row.productSkuText }}</div>
                                    <div class="text-sm text-muted-color mb-2 break-words">Kategori: {{ row.productCategoryName }}</div>
                                    <div class="text-sm text-muted-color mb-2 break-words">Klinik: {{ row.clinicName }}</div>
                                    <div class="text-sm mb-2">
                                        Eldeki: <span class="font-medium">{{ row.quantityText }}</span>
                                        · Min.: <span class="font-medium">{{ row.minimumStockLevelText }}</span>
                                    </div>
                                    <div class="mb-2">
                                        <app-status-tag [label]="row.statusLabel" [severity]="row.statusSeverity" />
                                    </div>
                                    <div class="text-xs text-muted-color mb-3">Güncelleme: {{ row.updatedAtText }}</div>
                                    @if (row.productId) {
                                        <div class="pt-2 border-t border-surface-200 dark:border-surface-700">
                                            <a
                                                [routerLink]="['/panel/products', row.productId]"
                                                class="text-primary font-medium no-underline text-sm"
                                                >Ürün detayı →</a
                                            >
                                        </div>
                                    }
                                </div>
                            }
                        </div>

                        <div class="lg:hidden mt-4">
                            <p-paginator
                                [rows]="pageSize()"
                                [totalRecords]="totalItems()"
                                [first]="first()"
                                [showCurrentPageReport]="true"
                                currentPageReportTemplate="{first} - {last} / {totalRecords}"
                                [rowsPerPageOptions]="[10, 25, 50]"
                                (onPageChange)="onMobilePageChange($event)"
                            />
                        </div>
                    }
                </div>
            }
        </div>
    `
})
export class ProductStocksPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly route = inject(ActivatedRoute);
    private readonly stockService = inject(ProductStockService);
    private readonly categoryService = inject(ProductCategoryService);
    private readonly auth = inject(AuthService);

    readonly canReadCategories = this.auth.hasOperationClaim(PRODUCT_CATEGORIES_READ_CLAIM);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);

    readonly rawItems = signal<ProductStockVm[]>([]);
    readonly totalItems = signal(0);
    readonly pageSize = signal(10);
    readonly first = signal(0);
    readonly currentPage = signal(1);

    readonly activeSearch = signal('');
    readonly activeLowStock = signal('');
    readonly activeCategoryId = signal('');

    searchInput = '';
    lowStockFilterInput = '';
    categoryFilterInput = '';

    readonly categoryOptions = signal<SelectOption[]>([]);

    readonly displayedRows = () => this.rawItems();

    readonly lowStockFilterOptions = [
        { label: 'Tümü', value: '' },
        { label: 'Sadece düşük stok', value: 'low' }
    ];

    private suppressNextLazy = false;
    private lastLoadKey = '';

    ngOnInit(): void {
        const restored = this.restoreStateFromSessionStorage();
        if (!restored) {
            this.currentPage.set(1);
            this.first.set(0);
        }
        if (this.route.snapshot.queryParamMap.get('isBelowMinimum') === 'true') {
            this.lowStockFilterInput = 'low';
            this.activeLowStock.set('low');
        }

        if (this.canReadCategories) {
            this.categoryService.list({ page: 1, pageSize: 500, isActive: true }).subscribe({
                next: (r) => {
                    this.categoryOptions.set((r.items ?? []).map(mapProductCategoryListItemVmToSelectOption));
                },
                error: () => {
                    this.categoryOptions.set([]);
                }
            });
        }

        this.suppressNextLazy = true;
        this.loadFromServer(this.currentPage(), this.pageSize(), this.activeSearch(), this.activeLowStock(), this.activeCategoryId(), true);
    }

    activeClinicContextHint(): string {
        const nm = this.auth.getClinicName()?.trim();
        if (nm) {
            return `Stoklar aktif klinik bağlamına göre listelenir. Aktif klinik: ${nm}.`;
        }
        return 'Stoklar aktif klinik bağlamına göre listelenir.';
    }

    emptyListMessage(): string {
        if (this.totalItems() > 0) {
            return '';
        }
        if (this.activeLowStock() === 'low') {
            return 'Düşük stokta ürün yok.';
        }
        return 'Stok kaydı bulunamadı.';
    }

    emptyListHint(): string {
        if (this.totalItems() > 0) {
            return '';
        }
        if (this.isSearchActive() || this.isLowStockFilterApplied() || this.isCategoryFilterApplied()) {
            return this.copy.listEmptyHint;
        }
        return '';
    }

    applyFilters(): void {
        this.activeSearch.set(this.searchInput.trim());
        this.activeLowStock.set(String(this.lowStockFilterInput ?? '').trim());
        this.activeCategoryId.set(String(this.categoryFilterInput ?? '').trim());
        this.first.set(0);
        this.currentPage.set(1);
        this.persistStateToSessionStorage(1, this.pageSize());
        this.loadFromServer(1, this.pageSize(), this.activeSearch(), this.activeLowStock(), this.activeCategoryId());
    }

    resetFilters(): void {
        this.searchInput = '';
        this.lowStockFilterInput = '';
        this.categoryFilterInput = '';
        this.activeSearch.set('');
        this.activeLowStock.set('');
        this.activeCategoryId.set('');
        this.first.set(0);
        this.currentPage.set(1);
        this.clearStateFromSessionStorage();
        this.loadFromServer(1, this.pageSize(), '', '', '');
    }

    reload(): void {
        this.loadFromServer(this.currentPage(), this.pageSize(), this.activeSearch(), this.activeLowStock(), this.activeCategoryId(), true);
    }

    onTableLazyLoad(event: TableLazyLoadEvent): void {
        if (this.suppressNextLazy) {
            this.suppressNextLazy = false;
            return;
        }
        const rows = event.rows ?? 10;
        const first = event.first ?? 0;
        const page = Math.floor(first / rows) + 1;
        this.persistStateToSessionStorage(page, rows);
        this.loadFromServer(page, rows, this.activeSearch(), this.activeLowStock(), this.activeCategoryId());
    }

    onMobilePageChange(state: PaginatorState): void {
        const rows = state.rows ?? this.pageSize();
        const first = state.first ?? 0;
        const page = Math.floor(first / rows) + 1;
        this.suppressNextLazy = true;
        this.persistStateToSessionStorage(page, rows);
        this.loadFromServer(page, rows, this.activeSearch(), this.activeLowStock(), this.activeCategoryId());
    }

    isSearchActive(): boolean {
        return !!this.activeSearch().trim();
    }

    isLowStockFilterApplied(): boolean {
        return this.activeLowStock() === 'low';
    }

    isCategoryFilterApplied(): boolean {
        return !!this.activeCategoryId().trim();
    }

    private loadFromServer(
        page: number,
        pageSize: number,
        search: string,
        lowStockMode: string,
        categoryId: string,
        force = false
    ): void {
        const key = `${page}|${pageSize}|${search.trim()}|${lowStockMode}|${categoryId.trim()}`;
        if (!force && key === this.lastLoadKey) {
            return;
        }
        this.lastLoadKey = key;
        this.loading.set(true);
        this.error.set(null);
        this.stockService
            .list({
                page,
                pageSize,
                search: search.trim() || undefined,
                isBelowMinimum: lowStockMode === 'low' ? true : undefined,
                productCategoryId: categoryId.trim() || undefined
            })
            .subscribe({
                next: (r) => {
                    this.rawItems.set(r.items);
                    this.totalItems.set(r.totalItems);
                    this.pageSize.set(r.pageSize);
                    this.currentPage.set(r.page);
                    this.first.set((r.page - 1) * r.pageSize);
                    this.persistStateToSessionStorage(r.page, r.pageSize);
                    this.loading.set(false);
                },
                error: (e: unknown) => {
                    const msg =
                        e instanceof Error && e.message.trim()
                            ? e.message.trim()
                            : 'Stok bilgileri yüklenemedi.';
                    this.error.set(msg);
                    this.loading.set(false);
                }
            });
    }

    private restoreStateFromSessionStorage(): boolean {
        const raw = sessionStorage.getItem(PRODUCT_STOCKS_LIST_STATE_KEY);
        if (!raw) {
            return false;
        }
        try {
            const parsed = JSON.parse(raw) as Partial<StocksListState & { clinicId?: string }>;
            const page = Number(parsed.page);
            const pageSize = Number(parsed.pageSize);
            if (!Number.isFinite(page) || page < 1 || !Number.isFinite(pageSize) || pageSize < 1) {
                return false;
            }
            this.searchInput = typeof parsed.search === 'string' ? parsed.search : '';
            this.lowStockFilterInput = typeof parsed.lowStockFilter === 'string' ? parsed.lowStockFilter : '';
            this.categoryFilterInput = typeof parsed.productCategoryId === 'string' ? parsed.productCategoryId : '';
            this.activeSearch.set(this.searchInput.trim());
            this.activeLowStock.set(String(this.lowStockFilterInput ?? '').trim());
            this.activeCategoryId.set(String(this.categoryFilterInput ?? '').trim());
            this.currentPage.set(page);
            this.pageSize.set(pageSize);
            this.first.set((page - 1) * pageSize);
            return true;
        } catch {
            return false;
        }
    }

    private persistStateToSessionStorage(page: number, pageSize: number): void {
        const state: StocksListState = {
            search: this.searchInput,
            lowStockFilter: this.lowStockFilterInput,
            productCategoryId: this.categoryFilterInput,
            page,
            pageSize
        };
        sessionStorage.setItem(PRODUCT_STOCKS_LIST_STATE_KEY, JSON.stringify(state));
    }

    private clearStateFromSessionStorage(): void {
        sessionStorage.removeItem(PRODUCT_STOCKS_LIST_STATE_KEY);
    }
}
