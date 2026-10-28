import { debouncedAction } from '@/app/shared/ui/search-input/debounced-action';
import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { Paginator } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ListPageState } from '@/app/shared/list/list-page-state';
import type { ProductListItemVm } from '@/app/entities/inventory/models/product-vm.model';
import { ProductService } from '@/app/entities/inventory/services/product.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { PRODUCTS_CREATE_CLAIM, PRODUCTS_DEACTIVATE_CLAIM, PRODUCTS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { ConfirmationService } from 'primeng/api';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

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
        AppListHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent,
        FilterFieldComponent,
        SearchInputComponent,
        AppRowActionButtonComponent
    ],
    providers: [ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card">
            <div class="flex flex-col gap-4">
                @if (listActionError()) {
                    <p class="text-red-500 text-sm m-0" role="alert">{{ listActionError() }}</p>
                }
                <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                    <app-list-header class="mb-3" title="Ürünler" [count]="totalItems()">
                        <app-filter-field label="Arama" labelFor="productSearch" [active]="isSearchActive()" width="grow">
                            <app-search-input inputId="productSearch" placeholder="Ad, SKU veya barkod…" [(value)]="searchInput" (searchRequested)="applyFilters()" />
                        </app-filter-field>
                        <button pButton type="button" actions severity="secondary" (click)="resetFilters()" [disabled]="loading()"><i class="p-button-icon pi pi-times"></i>{{ copy.buttonClear }}</button>
                        @if (canCreateProduct && !ro.mutationBlocked()) {
                            <a actions routerLink="/panel/products/new" pButton type="button" class="p-button-primary"><i class="pi pi-plus"></i>Yeni ürün</a>
                        } @else if (canCreateProduct && ro.mutationBlocked()) {
                            <button actions pButton type="button" [disabled]="true" class="p-button-secondary"><i class="pi pi-lock"></i>Yeni ürün (salt okunur)</button>
                        }
                    </app-list-header>
                    <div class="flex flex-wrap items-end gap-3">
                        <app-filter-field label="Durum filtresi" labelId="lblProductActive" [active]="isActiveFilterApplied()" width="select">
                            <p-select
                                ariaLabelledBy="lblProductActive"
                                inputId="productActiveFilter"
                                [options]="activeFilterOptions"
                                [(ngModel)]="isActiveFilter"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Tüm durumlar"
                                class="w-full"
                                [showClear]="true"
                                (ngModelChange)="scheduleApply()"
                            />
                        </app-filter-field>
                    </div>
                </div>
                @if (loading()) {
                    <app-loading-state message="Ürün listesi yükleniyor…" />
                } @else if (error()) {
                    <app-error-state [detail]="error()!" (retry)="reload()" />
                } @else {
                    @if (displayedRows().length === 0) {
                        <app-empty-state [message]="copy.listEmptyMessage" [hint]="copy.listEmptyHint" />
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
                                                <app-row-action-button action="detail" [link]="['/panel/products', row.id]" />
                                                @if (canUpdateProduct && !ro.mutationBlocked()) {
                                                    <app-row-action-button action="edit" [link]="['/panel/products', row.id, 'edit']" />
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
                                                    <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium text-primary disabled:opacity-50" [disabled]="rowMutatingId() !== null" (click)="onActivate(row)">
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
                                <div class="rounded-border border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4 shadow-sm">
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
                                        <app-row-action-button action="detail" [link]="['/panel/products', row.id]" />
                                        @if (canUpdateProduct && !ro.mutationBlocked()) {
                                            <app-row-action-button action="edit" [link]="['/panel/products', row.id, 'edit']" />
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
                                            <button type="button" class="p-0 m-0 border-none bg-transparent cursor-pointer text-sm font-medium text-primary disabled:opacity-50" [disabled]="rowMutatingId() !== null" (click)="onActivate(row)">
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
                                [rowsPerPageOptions]="rowsPerPageOptions"
                                (onPageChange)="list.onMobilePageChange($event)"
                            />
                        </div>
                    }
                }
            </div>
        </div>

        <p-confirmdialog [style]="{ width: 'min(450px, 95vw)' }" />
    `
})
export class ProductListPageComponent implements OnInit {
    protected readonly scheduleApply = debouncedAction(() => this.applyFilters());
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

    readonly list = new ListPageState<ProductListItemVm>({
        fetch: (page, pageSize) =>
            this.productService
                .getProducts({
                    page,
                    pageSize,
                    search: this.activeSearch().trim() || undefined,
                    isActive: this.parseIsActive(this.activeIsActiveFilter())
                }),
        loadKey: (page, pageSize) => `${page}|${pageSize}|${this.activeSearch().trim()}|${this.activeIsActiveFilter()}`,
        persist: {
            key: PRODUCTS_LIST_STATE_KEY,
            save: (): Omit<ProductsListState, 'page' | 'pageSize'> => ({
                search: this.searchInput.trim(),
                isActiveFilter: this.activeIsActiveFilter()
            }),
            restore: (state) => {
                const parsed = state as Partial<ProductsListState>;

                this.searchInput = typeof parsed.search === 'string' ? parsed.search : '';
                this.activeSearch.set(this.searchInput.trim());
                const af = typeof parsed.isActiveFilter === 'string' ? parsed.isActiveFilter : '';

                this.isActiveFilter = af === 'true' || af === 'false' ? af : '';
                this.activeIsActiveFilter.set(this.isActiveFilter);
            }
        }
    });

    readonly loading = this.list.loading;
    readonly error = this.list.error;

    readonly rawItems = this.list.items;
    readonly totalItems = this.list.totalItems;
    readonly rowsPerPageOptions = this.list.rowsPerPageOptions;
    readonly pageSize = this.list.pageSize;
    readonly first = this.list.first;
    readonly currentPage = this.list.currentPage;

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

    ngOnInit(): void {
        const restored = this.list.restore();

        if (!restored) {
            this.list.goToFirstPage();
        }

        this.list.startInitialLoad();
    }

    applyFilters(): void {
        this.activeSearch.set(this.searchInput.trim());
        this.activeIsActiveFilter.set(String(this.isActiveFilter ?? '').trim());
        this.list.loadFirstPage();
    }

    resetFilters(): void {
        this.searchInput = '';
        this.isActiveFilter = '';
        this.activeSearch.set('');
        this.activeIsActiveFilter.set('');
        this.list.resetToFirstPage();
    }

    reload(): void {
        this.list.reload();
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
                        this.listActionError.set(panelHttpFailureMessage(e, 'Pasifleştirme başarısız.'));
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
                        this.listActionError.set(panelHttpFailureMessage(e, 'Aktifleştirme başarısız.'));
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

}
