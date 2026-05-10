import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { Paginator } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/types/paginator';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import type { ProductListItemVm } from '@/app/features/inventory/models/product-vm.model';
import { ProductService } from '@/app/features/inventory/services/product.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    PRODUCTS_CREATE_CLAIM,
    PRODUCTS_DEACTIVATE_CLAIM,
    PRODUCTS_UPDATE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { ConfirmationService } from 'primeng/api';

type ProductsListState = {
    search: string;
    isActiveFilter: string;
    page: number;
    pageSize: number;
};

const PRODUCTS_LIST_STATE_KEY = 'panel:inventory:products:listState';

@Component({
    selector: 'app-product-list-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        TableModule,
        Paginator,
        ButtonModule,
        ConfirmDialogModule,
        InputTextModule,
        SelectModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    providers: [ConfirmationService],
    template: `
        <app-page-header title="Ürünler" subtitle="Ürün ve Stok" description="Ürün kataloğu.">
            @if (canCreateProduct && !ro.mutationBlocked()) {
                <a actions routerLink="/panel/products/new" pButton type="button" label="Yeni ürün" icon="pi pi-plus" class="p-button-primary"></a>
            } @else if (canCreateProduct && ro.mutationBlocked()) {
                <button
                    actions
                    pButton
                    type="button"
                    label="Yeni ürün (salt okunur)"
                    icon="pi pi-lock"
                    [disabled]="true"
                    class="p-button-secondary"
                ></button>
            }
        </app-page-header>

        <div class="card">
            @if (loading()) {
                <app-loading-state message="Ürün listesi yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else {
                <div class="flex flex-col gap-4">
                    @if (listActionError()) {
                        <p class="text-red-500 text-sm m-0" role="alert">{{ listActionError() }}</p>
                    }
                    <div class="pb-3 border-b border-surface-200 dark:border-surface-700">
                        <div class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3 mb-3">
                            <div class="min-w-0">
                                <h5 class="m-0">Ürünler</h5>
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
                                        for="productSearch"
                                        class="flex items-center gap-2 text-xs font-medium mb-1"
                                        [ngClass]="isSearchActive() ? 'text-primary-800 dark:text-primary-200' : 'text-muted-color'"
                                    >
                                        Arama
                                        @if (isSearchActive()) {
                                            <span
                                                class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100"
                                            >
                                                Aktif
                                            </span>
                                        }
                                    </label>
                                    <input
                                        pInputText
                                        id="productSearch"
                                        class="w-full"
                                        [ngClass]="isSearchActive() ? 'border-primary-300 dark:border-primary-600 bg-primary-50/30 dark:bg-primary-900/15' : ''"
                                        [(ngModel)]="searchInput"
                                        placeholder="Ad, SKU veya barkod…"
                                        (keyup.enter)="applyFilters()"
                                    />
                                </div>
                                <div class="flex flex-wrap gap-2 shrink-0">
                                    <p-button [label]="copy.buttonSearch" icon="pi pi-search" (onClick)="applyFilters()" [disabled]="loading()" />
                                    <p-button [label]="copy.buttonClear" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-12 gap-3 items-end">
                            <div
                                class="col-span-12 md:col-span-6 lg:col-span-4 rounded-lg border p-2 transition-colors"
                                [ngClass]="
                                    isActiveFilterApplied()
                                        ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
                                        : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900'
                                "
                            >
                                <span
                                    id="lblProductActive"
                                    class="flex items-center gap-2 text-xs font-medium mb-1"
                                    [ngClass]="isActiveFilterApplied() ? 'text-primary-800 dark:text-primary-200' : 'text-muted-color'"
                                >
                                    Durum filtresi
                                    @if (isActiveFilterApplied()) {
                                        <span
                                            class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100"
                                        >
                                            Aktif
                                        </span>
                                    }
                                </span>
                                <p-select
                                    ariaLabelledBy="lblProductActive"
                                    inputId="productActiveFilter"
                                    [options]="activeFilterOptions"
                                    [(ngModel)]="isActiveFilter"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Tüm durumlar"
                                    styleClass="w-full"
                                    [showClear]="true"
                                />
                            </div>
                        </div>
                    </div>
                    @if (displayedRows().length === 0) {
                        <app-empty-state [message]="copy.listEmptyMessage" [hint]="copy.listEmptyHint" />
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
                                [tableStyle]="{ 'min-width': '62rem' }"
                                [showCurrentPageReport]="true"
                                currentPageReportTemplate="{first} - {last} / {totalRecords}"
                            >
                                <ng-template #header>
                                    <tr>
                                        <th>Ürün adı</th>
                                        <th>SKU</th>
                                        <th>Kategori</th>
                                        <th>Birim</th>
                                        <th class="text-right">Birim fiyat</th>
                                        <th>Durum</th>
                                        <th style="min-width: 14rem">İşlemler</th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-row>
                                    <tr>
                                        <td class="font-medium">{{ row.name }}</td>
                                        <td>{{ row.sku }}</td>
                                        <td>{{ row.categoryName }}</td>
                                        <td>{{ row.unit }}</td>
                                        <td class="text-right">{{ row.unitPriceText }}</td>
                                        <td>
                                            <app-status-tag [label]="row.statusLabel" [severity]="row.statusSeverity" />
                                        </td>
                                        <td>
                                            <div class="flex flex-wrap gap-x-3 gap-y-1 items-center">
                                                <a [routerLink]="['/panel/products', row.id]" class="text-primary font-medium no-underline">Detay</a>
                                                @if (canUpdateProduct && !ro.mutationBlocked()) {
                                                    <a [routerLink]="['/panel/products', row.id, 'edit']" class="text-primary font-medium no-underline"
                                                        >Düzenle</a>
                                                }
                                                @if (canDeactivateProduct && !ro.mutationBlocked() && row.isActive) {
                                                    <button
                                                        type="button"
                                                        class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium text-red-600 dark:text-red-400 disabled:opacity-50"
                                                        [disabled]="rowMutatingId() !== null"
                                                        (click)="onDeactivate(row)"
                                                    >
                                                        Pasifleştir
                                                    </button>
                                                }
                                                @if (canUpdateProduct && !ro.mutationBlocked() && !row.isActive) {
                                                    <button
                                                        type="button"
                                                        class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium text-primary disabled:opacity-50"
                                                        [disabled]="rowMutatingId() !== null"
                                                        (click)="onActivate(row)"
                                                    >
                                                        Aktifleştir
                                                    </button>
                                                }
                                            </div>
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
                                    <div class="text-sm font-medium text-surface-900 dark:text-surface-0 min-w-0 mb-3">
                                        <a [routerLink]="['/panel/products', row.id]" class="text-primary no-underline break-words">{{ row.name }}</a>
                                    </div>
                                    <div class="space-y-2 mb-3 min-w-0 text-sm">
                                        <div>
                                            <span class="text-muted-color font-medium">SKU: </span>
                                            <span class="break-words">{{ row.sku }}</span>
                                        </div>
                                        <div>
                                            <span class="text-muted-color font-medium">Kategori: </span>
                                            <span class="break-words">{{ row.categoryName }}</span>
                                        </div>
                                        <div>
                                            <span class="text-muted-color font-medium">Birim: </span>
                                            {{ row.unit }}
                                        </div>
                                        <div class="font-medium">{{ row.unitPriceText }}</div>
                                        <div>
                                            <app-status-tag [label]="row.statusLabel" [severity]="row.statusSeverity" />
                                        </div>
                                    </div>
                                    <div class="flex flex-wrap justify-end gap-x-3 gap-y-2 pt-1 border-t border-surface-200 dark:border-surface-700">
                                        <a [routerLink]="['/panel/products', row.id]" class="text-primary font-medium no-underline">Detay</a>
                                        @if (canUpdateProduct && !ro.mutationBlocked()) {
                                            <a [routerLink]="['/panel/products', row.id, 'edit']" class="text-primary font-medium no-underline">Düzenle</a>
                                        }
                                        @if (canDeactivateProduct && !ro.mutationBlocked() && row.isActive) {
                                            <button
                                                type="button"
                                                class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium text-red-600 dark:text-red-400 disabled:opacity-50"
                                                [disabled]="rowMutatingId() !== null"
                                                (click)="onDeactivate(row)"
                                            >
                                                Pasifleştir
                                            </button>
                                        }
                                        @if (canUpdateProduct && !ro.mutationBlocked() && !row.isActive) {
                                            <button
                                                type="button"
                                                class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium text-primary disabled:opacity-50"
                                                [disabled]="rowMutatingId() !== null"
                                                (click)="onActivate(row)"
                                            >
                                                Aktifleştir
                                            </button>
                                        }
                                    </div>
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

        <p-confirmdialog [style]="{ width: 'min(450px, 95vw)' }" />
    `
})
export class ProductListPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly productService = inject(ProductService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canCreateProduct = this.auth.hasOperationClaim(PRODUCTS_CREATE_CLAIM);
    readonly canUpdateProduct = this.auth.hasOperationClaim(PRODUCTS_UPDATE_CLAIM);
    readonly canDeactivateProduct = this.auth.hasOperationClaim(PRODUCTS_DEACTIVATE_CLAIM);

    readonly rowMutatingId = signal<string | null>(null);
    readonly listActionError = signal<string | null>(null);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);

    readonly rawItems = signal<ProductListItemVm[]>([]);
    readonly totalItems = signal(0);
    readonly pageSize = signal(10);
    readonly first = signal(0);
    readonly currentPage = signal(1);

    readonly activeSearch = signal('');
    readonly activeIsActiveFilter = signal('');

    searchInput = '';
    /** '', 'true', 'false' */
    isActiveFilter = '';

    readonly displayedRows = computed(() => this.rawItems());

    readonly activeFilterOptions = [
        { label: 'Aktif', value: 'true' },
        { label: 'Pasif', value: 'false' }
    ];

    private suppressNextLazy = false;
    private lastLoadKey = '';

    ngOnInit(): void {
        const restored = this.restoreStateFromSessionStorage();
        if (!restored) {
            this.currentPage.set(1);
            this.first.set(0);
        }
        this.suppressNextLazy = true;
        this.loadFromServer(this.currentPage(), this.pageSize(), this.activeSearch(), this.activeIsActiveFilter());
    }

    applyFilters(): void {
        this.activeSearch.set(this.searchInput.trim());
        this.activeIsActiveFilter.set(String(this.isActiveFilter ?? '').trim());
        this.first.set(0);
        this.currentPage.set(1);
        this.persistStateToSessionStorage(1, this.pageSize());
        this.loadFromServer(1, this.pageSize(), this.activeSearch(), this.activeIsActiveFilter());
    }

    resetFilters(): void {
        this.searchInput = '';
        this.isActiveFilter = '';
        this.activeSearch.set('');
        this.activeIsActiveFilter.set('');
        this.first.set(0);
        this.currentPage.set(1);
        this.clearStateFromSessionStorage();
        this.loadFromServer(1, this.pageSize(), '', '');
    }

    reload(): void {
        this.loadFromServer(this.currentPage(), this.pageSize(), this.activeSearch(), this.activeIsActiveFilter(), true);
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
        this.loadFromServer(page, rows, this.activeSearch(), this.activeIsActiveFilter());
    }

    onMobilePageChange(state: PaginatorState): void {
        const rows = state.rows ?? this.pageSize();
        const first = state.first ?? 0;
        const page = Math.floor(first / rows) + 1;
        this.suppressNextLazy = true;
        this.persistStateToSessionStorage(page, rows);
        this.loadFromServer(page, rows, this.activeSearch(), this.activeIsActiveFilter());
    }

    isSearchActive(): boolean {
        return !!this.activeSearch().trim();
    }

    isActiveFilterApplied(): boolean {
        return this.activeIsActiveFilter() === 'true' || this.activeIsActiveFilter() === 'false';
    }

    onDeactivate(row: ProductListItemVm): void {
        if (!this.canDeactivateProduct || this.ro.mutationBlocked() || !row.isActive) {
            return;
        }
        const productId = row.id;
        this.confirmationService.confirm({
            header: 'Ürünü pasifleştir',
            message: 'Bu ürünü pasifleştirmek istediğinize emin misiniz?',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Pasifleştir',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => {
                this.rowMutatingId.set(productId);
                this.listActionError.set(null);
                this.productService.deactivate(productId).subscribe({
                    next: () => {
                        this.rowMutatingId.set(null);
                        this.reload();
                    },
                    error: (e: Error) => {
                        this.rowMutatingId.set(null);
                        this.listActionError.set(e.message ?? 'Pasifleştirme başarısız.');
                    }
                });
            }
        });
    }

    onActivate(row: ProductListItemVm): void {
        if (!this.canUpdateProduct || this.ro.mutationBlocked() || row.isActive) {
            return;
        }
        const productId = row.id;
        this.confirmationService.confirm({
            header: 'Ürünü aktifleştir',
            message: 'Bu ürünü tekrar aktif hale getirmek istediğinize emin misiniz?',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Aktifleştir',
            rejectLabel: 'Vazgeç',
            acceptButtonStyleClass: 'p-button-primary',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => {
                this.rowMutatingId.set(productId);
                this.listActionError.set(null);
                this.productService.activate(productId).subscribe({
                    next: () => {
                        this.rowMutatingId.set(null);
                        this.reload();
                    },
                    error: (e: Error) => {
                        this.rowMutatingId.set(null);
                        this.listActionError.set(e.message ?? 'Aktifleştirme başarısız.');
                    }
                });
            }
        });
    }

    private parseIsActive(filter: string): boolean | undefined {
        if (filter === 'true') {
            return true;
        }
        if (filter === 'false') {
            return false;
        }
        return undefined;
    }

    private loadFromServer(page: number, pageSize: number, search: string, isActiveFilterStr: string, force = false): void {
        const key = `${page}|${pageSize}|${search.trim()}|${isActiveFilterStr}`;
        if (!force && key === this.lastLoadKey) {
            return;
        }
        this.lastLoadKey = key;
        this.loading.set(true);
        this.error.set(null);
        this.productService
            .getProducts({
                page,
                pageSize,
                search: search.trim() || undefined,
                isActive: this.parseIsActive(isActiveFilterStr)
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
                error: (e: Error) => {
                    this.error.set(e.message ?? 'Yükleme hatası');
                    this.loading.set(false);
                }
            });
    }

    private restoreStateFromSessionStorage(): boolean {
        const raw = sessionStorage.getItem(PRODUCTS_LIST_STATE_KEY);
        if (!raw) {
            return false;
        }
        try {
            const parsed = JSON.parse(raw) as Partial<ProductsListState>;
            const page = Number(parsed.page);
            const pageSize = Number(parsed.pageSize);
            if (!Number.isFinite(page) || page < 1 || !Number.isFinite(pageSize) || pageSize < 1) {
                sessionStorage.removeItem(PRODUCTS_LIST_STATE_KEY);
                return false;
            }
            this.searchInput = typeof parsed.search === 'string' ? parsed.search : '';
            this.activeSearch.set(this.searchInput.trim());
            const af = typeof parsed.isActiveFilter === 'string' ? parsed.isActiveFilter : '';
            this.isActiveFilter = af === 'true' || af === 'false' ? af : '';
            this.activeIsActiveFilter.set(this.isActiveFilter);
            this.pageSize.set(pageSize);
            this.currentPage.set(page);
            this.first.set((page - 1) * pageSize);
            return true;
        } catch {
            sessionStorage.removeItem(PRODUCTS_LIST_STATE_KEY);
            return false;
        }
    }

    private persistStateToSessionStorage(page: number, pageSize: number): void {
        const state: ProductsListState = {
            search: this.searchInput.trim(),
            isActiveFilter: this.activeIsActiveFilter(),
            page,
            pageSize
        };
        sessionStorage.setItem(PRODUCTS_LIST_STATE_KEY, JSON.stringify(state));
    }

    private clearStateFromSessionStorage(): void {
        sessionStorage.removeItem(PRODUCTS_LIST_STATE_KEY);
    }
}
