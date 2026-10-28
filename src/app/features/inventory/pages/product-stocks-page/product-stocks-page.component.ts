import { debouncedAction } from '@/app/shared/ui/search-input/debounced-action';
import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Paginator } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ListPageState } from '@/app/shared/list/list-page-state';
import { mapProductCategoryListItemVmToSelectOption } from '@/app/features/inventory/data/product-category.mapper';
import type { ProductStockVm } from '@/app/entities/inventory/models/product-stock-vm.model';
import { ProductCategoryService } from '@/app/features/inventory/services/product-category.service';
import { ProductStockService } from '@/app/entities/inventory/services/product-stock.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { PRODUCT_CATEGORIES_READ_CLAIM, PRODUCTS_READ_CLAIM, STOCK_MOVEMENTS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { suggestedReceiptQuantity } from '@/app/features/inventory/utils/goods-receipt.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { buildCsvFromStringRows, csvTextToUtf8BlobWithBom } from '@/app/shared/utils/csv-text.utils';
import { localDateTimeYyyyMmDd_HHmmForFileName } from '@/app/shared/utils/date.utils';
import { triggerBlobDownload } from '@/app/shared/utils/file-download.utils';
import { fetchAllInventoryCsvExportPages$, InventoryCsvExportRowLimitError } from '@/app/features/inventory/utils/inventory-csv-export-pagination.utils';
import type { Observable } from 'rxjs';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';

type StocksListState = {
    search: string;
    lowStockFilter: string;
    productCategoryId: string;
    page: number;
    pageSize: number;
};

const PRODUCT_STOCKS_LIST_STATE_KEY = 'panel:inventory:product-stocks:listState';

const PRODUCT_STOCK_CSV_HEADERS = ['Ürün', 'SKU', 'Kategori', 'Klinik', 'Kullanılabilir Stok', 'Süresi Geçmiş Stok', 'Minimum Stok', 'Durum', 'Son Güncelleme'] as const;

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
        AppListHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent,
        FilterFieldComponent,
        SearchInputComponent,
        AppRowActionButtonComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card">
            @if (exportError()) {
                <div class="mb-4 border border-red-200 dark:border-red-800 rounded-border p-3">
                    <p class="text-red-500 m-0 text-sm" role="alert">{{ exportError() }}</p>
                </div>
            }

            <div class="flex flex-col gap-4">
                <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                    <app-list-header class="mb-3" title="Stok durumu" [count]="totalItems()">
                        <p hint class="text-muted-color text-sm m-0 mt-1">{{ activeClinicContextHint() }}</p>
                        <app-filter-field label="Arama" labelFor="stockSearch" [active]="isSearchActive()" width="grow">
                            <app-search-input inputId="stockSearch" placeholder="Ürün adı, SKU…" [(value)]="searchInput" (searchRequested)="applyFilters()" />
                        </app-filter-field>
                        <button pButton type="button" actions severity="secondary" (click)="resetFilters()" [disabled]="loading()"><i class="p-button-icon pi pi-times"></i>{{ copy.buttonClear }}</button>
                        @if (canExportStocks()) {
                            <button pButton type="button" actions severity="help" (click)="exportCsv()" [disabled]="loading() || exporting()"><i class="p-button-icon" [class]="exporting() ? 'pi pi-spin pi-spinner' : 'pi pi-download'"></i>Dışa aktar</button>
                        }
                    </app-list-header>
                    <div class="flex flex-wrap items-end gap-3">
                        @if (canReadCategories && categoryOptions().length > 0) {
                            <app-filter-field label="Kategori" labelId="lblStockCat" [active]="isCategoryFilterApplied()" width="select">
                                <p-select
                                    ariaLabelledBy="lblStockCat"
                                    inputId="stockCategoryFilter"
                                    [options]="categoryOptions()"
                                    [(ngModel)]="categoryFilterInput"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Tüm kategoriler"
                                    class="w-full"
                                    [filter]="true"
                                    filterPlaceholder="Ara…"
                                    filterBy="label"
                                    [showClear]="true"
                                    (ngModelChange)="scheduleApply()"
                                />
                            </app-filter-field>
                        }
                        <app-filter-field label="Düşük stok" labelId="lblStockLow" [active]="isLowStockFilterApplied()" width="select">
                            <p-select
                                ariaLabelledBy="lblStockLow"
                                inputId="stockLowFilter"
                                [options]="lowStockFilterOptions"
                                [(ngModel)]="lowStockFilterInput"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Tümü"
                                class="w-full"
                                (ngModelChange)="scheduleApply()"
                            />
                        </app-filter-field>
                    </div>
                </div>
                @if (loading()) {
                    <app-loading-state message="Stok listesi yükleniyor…" />
                } @else if (error()) {
                    <app-error-state [detail]="error()!" (retry)="reload()" />
                } @else {
                    @if (displayedRows().length === 0) {
                        <app-empty-state [message]="emptyListMessage()" [hint]="emptyListHint()" />
                    } @else {
                        <div class="hidden lg:block overflow-x-auto">
                            <p-table
                                [value]="displayedRows()"
                                [paginator]="true"
                                [rows]="pageSize()"
                                [rowsPerPageOptions]="rowsPerPageOptions"
                                [paginatorDropdownAppendTo]="'body'"
                                [totalRecords]="totalItems()"
                                [lazy]="true"
                                [first]="first()"
                                (onLazyLoad)="list.onTableLazyLoad($event)"
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
                                        <th class="text-right">Kullanılabilir</th>
                                        <th class="text-right">Süresi geçmiş</th>
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
                                        <td class="text-right whitespace-nowrap">{{ row.availableText }}</td>
                                        <td class="text-right whitespace-nowrap">
                                            @if (row.hasExpired) {
                                                <span class="font-medium text-red-600 dark:text-red-400" data-testid="expired-qty">{{ row.expiredText }}</span>
                                            } @else {
                                                <span class="text-muted-color">—</span>
                                            }
                                        </td>
                                        <td class="text-right whitespace-nowrap">{{ row.minimumStockLevelText }}</td>
                                        <td>
                                            <app-status-tag [label]="row.statusLabel" [severity]="row.statusSeverity" />
                                        </td>
                                        <td class="text-muted-color text-sm whitespace-nowrap">{{ row.updatedAtText }}</td>
                                        <td>
                                            @if (row.productId) {
                                                <app-row-action-button action="detail" [link]="['/panel/products', row.productId]" />
                                            }
                                            @if (canReceiveGoods && row.isBelowMinimum && row.productId) {
                                                <a routerLink="/panel/goods-receipts" [queryParams]="receiptQueryParams(row)" class="text-primary font-medium no-underline text-sm ml-3" data-testid="stock-receive">Giriş</a>
                                            }
                                        </td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>

                        <div class="lg:hidden space-y-3">
                            @for (row of displayedRows(); track row.id) {
                                <div class="rounded-border border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4 shadow-sm">
                                    <div class="text-base font-semibold text-surface-900 dark:text-surface-0 mb-1 break-words">{{ row.productName }}</div>
                                    <div class="text-sm text-muted-color mb-2">SKU: {{ row.productSkuText }}</div>
                                    <div class="text-sm text-muted-color mb-2 break-words">Kategori: {{ row.productCategoryName }}</div>
                                    <div class="text-sm text-muted-color mb-2 break-words">Klinik: {{ row.clinicName }}</div>
                                    <div class="text-sm mb-2">
                                        Kullanılabilir: <span class="font-medium">{{ row.availableText }}</span>
                                        @if (row.hasExpired) {
                                            · Süresi geçmiş: <span class="font-medium text-red-600 dark:text-red-400">{{ row.expiredText }}</span>
                                        }
                                        · Min.: <span class="font-medium">{{ row.minimumStockLevelText }}</span>
                                    </div>
                                    <div class="mb-2">
                                        <app-status-tag [label]="row.statusLabel" [severity]="row.statusSeverity" />
                                    </div>
                                    <div class="text-xs text-muted-color mb-3">Güncelleme: {{ row.updatedAtText }}</div>
                                    @if (row.productId) {
                                        <div class="pt-2 border-t border-surface-200 dark:border-surface-700">
                                            <a [routerLink]="['/panel/products', row.productId]" class="text-primary font-medium no-underline text-sm">Ürün detayı →</a>
                                            @if (canReceiveGoods && row.isBelowMinimum) {
                                                <a routerLink="/panel/goods-receipts" [queryParams]="receiptQueryParams(row)" class="text-primary font-medium no-underline text-sm ml-4" data-testid="stock-receive">Giriş →</a>
                                            }
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
                                [rowsPerPageOptions]="rowsPerPageOptions"
                                (onPageChange)="list.onMobilePageChange($event)"
                            />
                        </div>
                    }
                }
            </div>
        </div>
    `
})
export class ProductStocksPageComponent implements OnInit {
    protected readonly scheduleApply = debouncedAction(() => this.applyFilters());
    readonly copy = PANEL_COPY;

    private readonly route = inject(ActivatedRoute);
    private readonly stockService = inject(ProductStockService);
    private readonly categoryService = inject(ProductCategoryService);
    private readonly auth = inject(AuthService);

    readonly canReadCategories = this.auth.hasOperationClaim(PRODUCT_CATEGORIES_READ_CLAIM);
    readonly canExportStocks = computed(() => this.auth.hasOperationClaim(PRODUCTS_READ_CLAIM));
    readonly canReceiveGoods = this.auth.hasOperationClaim(STOCK_MOVEMENTS_CREATE_CLAIM);

    readonly list = new ListPageState<ProductStockVm>({
        fetch: (page, pageSize) =>
            this.stockService
                .list({
                    page,
                    pageSize,
                    search: this.activeSearch().trim() || undefined,
                    isBelowMinimum: this.activeLowStock() === 'low' ? true : undefined,
                    productCategoryId: this.activeCategoryId().trim() || undefined
                }),
        loadKey: (page, pageSize) => `${page}|${pageSize}|${this.activeSearch().trim()}|${this.activeLowStock()}|${this.activeCategoryId().trim()}`,
        errorMessage: (e) => e instanceof Error && e.message.trim() ? e.message.trim() : 'Stok bilgileri yüklenemedi.',
        persist: {
            key: PRODUCT_STOCKS_LIST_STATE_KEY,
            save: (): Omit<StocksListState, 'page' | 'pageSize'> => ({
                search: this.searchInput,
                lowStockFilter: this.lowStockFilterInput,
                productCategoryId: this.categoryFilterInput
            }),
            restore: (state) => {
                const parsed = state as Partial<StocksListState & { clinicId?: string }>;

                this.searchInput = typeof parsed.search === 'string' ? parsed.search : '';
                this.lowStockFilterInput = typeof parsed.lowStockFilter === 'string' ? parsed.lowStockFilter : '';
                this.categoryFilterInput = typeof parsed.productCategoryId === 'string' ? parsed.productCategoryId : '';
                this.activeSearch.set(this.searchInput.trim());
                this.activeLowStock.set(String(this.lowStockFilterInput ?? '').trim());
                this.activeCategoryId.set(String(this.categoryFilterInput ?? '').trim());
            }
        }
    });

    readonly loading = this.list.loading;
    readonly error = this.list.error;
    readonly exporting = signal(false);
    readonly exportError = signal<string | null>(null);

    readonly rawItems = this.list.items;
    readonly totalItems = this.list.totalItems;
    readonly rowsPerPageOptions = this.list.rowsPerPageOptions;
    readonly pageSize = this.list.pageSize;
    readonly first = this.list.first;
    readonly currentPage = this.list.currentPage;

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

    ngOnInit(): void {
        const restored = this.list.restore();

        if (!restored) {
            this.list.goToFirstPage();
        }

        if (this.route.snapshot.queryParamMap.get('isBelowMinimum') === 'true') {
            this.lowStockFilterInput = 'low';
            this.activeLowStock.set('low');
        }

        if (this.canReadCategories) {
            this.categoryService.list({ page: 1, pageSize: 200, isActive: true }).subscribe({
                next: (r) => {
                    this.categoryOptions.set((r.items ?? []).map(mapProductCategoryListItemVmToSelectOption));
                },
                error: () => {
                    this.categoryOptions.set([]);
                }
            });
        }

        this.list.startInitialLoad();
    }

    /** Düşük stok kısayolu: mal kabulü bu ürün, klinik ve önerilen miktarla açar. */
    receiptQueryParams(row: ProductStockVm): Record<string, string> {
        return { productId: row.productId, clinicId: row.clinicId, quantity: String(suggestedReceiptQuantity(row)) };
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
        this.exportError.set(null);
        this.activeSearch.set(this.searchInput.trim());
        this.activeLowStock.set(String(this.lowStockFilterInput ?? '').trim());
        this.activeCategoryId.set(String(this.categoryFilterInput ?? '').trim());
        this.list.loadFirstPage();
    }

    resetFilters(): void {
        this.exportError.set(null);
        this.searchInput = '';
        this.lowStockFilterInput = '';
        this.categoryFilterInput = '';
        this.activeSearch.set('');
        this.activeLowStock.set('');
        this.activeCategoryId.set('');
        this.list.resetToFirstPage();
    }

    reload(): void {
        this.exportError.set(null);
        this.list.reload();
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

    exportCsv(): void {
        if (!this.auth.hasOperationClaim(PRODUCTS_READ_CLAIM)) {
            return;
        }

        this.exportError.set(null);
        this.exporting.set(true);
        this.fetchAllFilteredStocksForExport().subscribe({
            next: (items) => {
                const rows = items.map((row) => this.mapStockVmToCsvRow(row));
                const csv = buildCsvFromStringRows([...PRODUCT_STOCK_CSV_HEADERS], rows);
                const blob = csvTextToUtf8BlobWithBom(csv);
                const name = `stok-durumu-${localDateTimeYyyyMmDd_HHmmForFileName()}.csv`;

                triggerBlobDownload(blob, name);
                this.exporting.set(false);
            },
            error: (e: unknown) => {
                this.exporting.set(false);

                if (e instanceof InventoryCsvExportRowLimitError) {
                    this.exportError.set('Dışa aktarılacak kayıt sayısı çok yüksek. Lütfen filtreleri daraltın.');

                    return;
                }

                this.exportError.set('Stok durumu dışa aktarılamadı.');
            }
        });
    }

    private fetchAllFilteredStocksForExport(): Observable<ProductStockVm[]> {
        const search = this.activeSearch().trim();
        const lowStockMode = this.activeLowStock();
        const categoryId = this.activeCategoryId().trim();
        const q = {
            search: search || undefined,
            isBelowMinimum: lowStockMode === 'low' ? true : undefined,
            productCategoryId: categoryId || undefined
        };

        return fetchAllInventoryCsvExportPages$((page, pageSize) => this.stockService.list({ page, pageSize, ...q }));
    }

    private mapStockVmToCsvRow(row: ProductStockVm): string[] {
        const statusLabel = row.isBelowMinimum ? 'Düşük stok' : 'Yeterli';

        return [
            this.exportDisplayCell(row.productName),
            this.exportDisplayCell(row.productSkuText),
            this.exportDisplayCell(row.productCategoryName),
            this.exportDisplayCell(row.clinicName),
            this.exportDisplayCell(row.availableText),
            this.exportDisplayCell(row.expiredText),
            this.exportDisplayCell(row.minimumStockLevelText),
            statusLabel,
            this.exportDisplayCell(row.updatedAtText)
        ];
    }

    private exportDisplayCell(value: string): string {
        const t = (value ?? '').trim();

        return t === '—' ? '' : t;
    }
}
