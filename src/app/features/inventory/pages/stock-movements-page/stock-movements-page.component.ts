import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Paginator } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/types/paginator';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import type { StockMovementVm } from '@/app/features/inventory/models/stock-movement-vm.model';
import { StockMovementCreateDialogComponent } from '@/app/features/inventory/components/stock-movement-create-dialog/stock-movement-create-dialog.component';
import { StockMovementService } from '@/app/features/inventory/services/stock-movement.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { STOCK_MOVEMENTS_CREATE_CLAIM, STOCK_MOVEMENTS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { buildCsvFromStringRows, csvTextToUtf8BlobWithBom } from '@/app/shared/utils/csv-text.utils';
import { localDateTimeYyyyMmDd_HHmmForFileName } from '@/app/shared/utils/date.utils';
import { triggerBlobDownload } from '@/app/shared/utils/file-download.utils';
import {
    STOCK_MOVEMENT_CSV_HEADERS,
    stockMovementVmToCsvRow
} from '@/app/features/inventory/utils/stock-movement-export.utils';
import {
    fetchAllInventoryCsvExportPages$,
    InventoryCsvExportRowLimitError
} from '@/app/features/inventory/utils/inventory-csv-export-pagination.utils';
import type { Observable } from 'rxjs';

type StockMovementsListState = {
    search: string;
    movementType: string;
    dateFrom: string;
    dateTo: string;
    page: number;
    pageSize: number;
};

const LIST_STATE_KEY = 'panel:inventory:stock-movements:listState';

@Component({
    selector: 'app-stock-movements-page',
    standalone: true,
    providers: [MessageService],
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        TableModule,
        Paginator,
        ButtonModule,
        InputTextModule,
        SelectModule,
        ToastModule,
        StockMovementCreateDialogComponent,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    template: `
        <p-toast position="top-right" />

        <a routerLink="/panel/products" class="text-primary font-medium no-underline inline-block mb-4">← Ürünler</a>

        <app-page-header title="Stok hareketleri" subtitle="Ürün ve Stok" description="Klinik bazlı stok hareketleri; liste salt okunur. Yetkiniz varsa yeni kayıt ekleyebilirsiniz.">
            @if (canCreateStockMovement && !ro.mutationBlocked()) {
                <button
                    actions
                    pButton
                    type="button"
                    label="Yeni stok hareketi"
                    icon="pi pi-plus"
                    class="p-button-primary"
                    (click)="createDialogOpen.set(true)"
                ></button>
            } @else if (canCreateStockMovement && ro.mutationBlocked()) {
                <button
                    actions
                    pButton
                    type="button"
                    label="Yeni stok hareketi (salt okunur)"
                    icon="pi pi-lock"
                    [disabled]="true"
                    class="p-button-secondary"
                ></button>
            }
        </app-page-header>

        <div class="card">
            @if (exportError()) {
                <div class="mb-4 border border-red-200 dark:border-red-800 rounded-border p-3">
                    <p class="text-red-500 m-0 text-sm" role="alert">{{ exportError() }}</p>
                </div>
            }

            @if (loading()) {
                <app-loading-state message="Stok hareketleri yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else {
                <div class="flex flex-col gap-4">
                    <div class="pb-3 border-b border-surface-200 dark:border-surface-700">
                        <div class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3 mb-3">
                            <div class="min-w-0">
                                <h5 class="m-0">Hareketler</h5>
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
                                        for="smSearch"
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
                                        id="smSearch"
                                        class="w-full"
                                        [ngClass]="isSearchActive() ? 'border-primary-300 dark:border-primary-600 bg-primary-50/30 dark:bg-primary-900/15' : ''"
                                        [(ngModel)]="searchInput"
                                        placeholder="Ürün, SKU, kategori, klinik…"
                                        (keyup.enter)="applyFilters()"
                                    />
                                </div>
                                <div class="flex flex-wrap gap-2 shrink-0">
                                    <p-button [label]="copy.buttonSearch" icon="pi pi-search" (onClick)="applyFilters()" [disabled]="loading()" />
                                    <p-button [label]="copy.buttonClear" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
                                    @if (canExportStockMovements()) {
                                        <p-button
                                            label="Dışa aktar"
                                            icon="pi pi-download"
                                            severity="help"
                                            (onClick)="exportCsv()"
                                            [loading]="exporting()"
                                            [disabled]="loading() || exporting()"
                                        />
                                    }
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-12 gap-3 items-end">
                            <div
                                class="col-span-12 md:col-span-4 rounded-lg border p-2 transition-colors"
                                [ngClass]="
                                    movementTypeActive()
                                        ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
                                        : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900'
                                "
                            >
                                <span
                                    id="lblSmType"
                                    class="flex items-center gap-2 text-xs font-medium mb-1"
                                    [ngClass]="movementTypeActive() ? 'text-primary-800 dark:text-primary-200' : 'text-muted-color'"
                                >
                                    Hareket tipi
                                    @if (movementTypeActive()) {
                                        <span
                                            class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100"
                                        >
                                            Aktif
                                        </span>
                                    }
                                </span>
                                <p-select
                                    ariaLabelledBy="lblSmType"
                                    inputId="smMovementType"
                                    [options]="movementTypeOptions"
                                    [(ngModel)]="movementTypeFilter"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Tümü"
                                    styleClass="w-full"
                                    [showClear]="true"
                                />
                            </div>
                            <div
                                class="col-span-12 md:col-span-4 rounded-lg border p-2 transition-colors"
                                [ngClass]="
                                    isFromActive()
                                        ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
                                        : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900'
                                "
                            >
                                <label
                                    for="smFrom"
                                    class="flex items-center gap-2 text-xs font-medium mb-1"
                                    [ngClass]="isFromActive() ? 'text-primary-800 dark:text-primary-200' : 'text-muted-color'"
                                >
                                    Başlangıç (UTC tarih)
                                    @if (isFromActive()) {
                                        <span
                                            class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100"
                                        >
                                            Aktif
                                        </span>
                                    }
                                </label>
                                <input id="smFrom" type="date" class="w-full p-inputtext p-component" [(ngModel)]="dateFromInput" />
                            </div>
                            <div
                                class="col-span-12 md:col-span-4 rounded-lg border p-2 transition-colors"
                                [ngClass]="
                                    isToActive()
                                        ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
                                        : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900'
                                "
                            >
                                <label
                                    for="smTo"
                                    class="flex items-center gap-2 text-xs font-medium mb-1"
                                    [ngClass]="isToActive() ? 'text-primary-800 dark:text-primary-200' : 'text-muted-color'"
                                >
                                    Bitiş (UTC tarih)
                                    @if (isToActive()) {
                                        <span
                                            class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100"
                                        >
                                            Aktif
                                        </span>
                                    }
                                </label>
                                <input id="smTo" type="date" class="w-full p-inputtext p-component" [(ngModel)]="dateToInput" />
                            </div>
                        </div>
                    </div>

                    @if (displayedRows().length === 0) {
                        <app-empty-state [message]="copy.listEmptyMessage" [hint]="copy.listEmptyHint" />
                    } @else {
                        <div class="hidden xl:block overflow-x-auto">
                            <p-table
                                [value]="displayedRows()"
                                [paginator]="true"
                                [rows]="pageSize()"
                                [totalRecords]="totalItems()"
                                [lazy]="true"
                                [first]="first()"
                                (onLazyLoad)="onTableLazyLoad($event)"
                                [tableStyle]="{ 'min-width': '72rem' }"
                                [showCurrentPageReport]="true"
                                currentPageReportTemplate="{first} - {last} / {totalRecords}"
                            >
                                <ng-template #header>
                                    <tr>
                                        <th>Tarih</th>
                                        <th>Ürün</th>
                                        <th>Klinik</th>
                                        <th>Hareket tipi</th>
                                        <th class="text-right">Miktar</th>
                                        <th class="text-right">Birim maliyet</th>
                                        <th>Neden</th>
                                        <th>Not</th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-row>
                                    <tr>
                                        <td class="whitespace-nowrap">{{ row.occurredAtText }}</td>
                                        <td>
                                            @if (row.productId) {
                                                <a [routerLink]="['/panel/products', row.productId]" class="text-primary font-medium no-underline">{{
                                                    row.productDisplayName
                                                }}</a>
                                            } @else {
                                                {{ row.productDisplayName }}
                                            }
                                        </td>
                                        <td>{{ row.clinicName }}</td>
                                        <td>
                                            <app-status-tag [label]="row.movementTypeLabel" [severity]="row.movementTypeSeverity" />
                                        </td>
                                        <td class="text-right tabular-nums">{{ row.quantityText }}</td>
                                        <td class="text-right tabular-nums">{{ row.unitCostText }}</td>
                                        <td>{{ row.reason }}</td>
                                        <td class="max-w-[12rem] break-words">{{ row.notes }}</td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>

                        <div class="xl:hidden space-y-3">
                            @for (row of displayedRows(); track row.id) {
                                <div
                                    class="rounded-border border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4 shadow-sm"
                                >
                                    <div class="text-sm font-medium text-surface-900 dark:text-surface-0 mb-2 whitespace-nowrap">{{ row.occurredAtText }}</div>
                                    <div class="space-y-2 mb-3 text-sm">
                                        <div>
                                            <span class="text-muted-color font-medium">Ürün: </span>
                                            @if (row.productId) {
                                                <a [routerLink]="['/panel/products', row.productId]" class="text-primary font-medium no-underline break-words">{{
                                                    row.productDisplayName
                                                }}</a>
                                            } @else {
                                                <span class="break-words">{{ row.productDisplayName }}</span>
                                            }
                                        </div>
                                        <div><span class="text-muted-color font-medium">Klinik: </span>{{ row.clinicName }}</div>
                                        <div class="flex flex-wrap items-center gap-2">
                                            <span class="text-muted-color font-medium">Tip:</span>
                                            <app-status-tag [label]="row.movementTypeLabel" [severity]="row.movementTypeSeverity" />
                                        </div>
                                        <div class="tabular-nums"><span class="text-muted-color font-medium">Miktar: </span>{{ row.quantityText }}</div>
                                        <div class="tabular-nums"><span class="text-muted-color font-medium">Birim maliyet: </span>{{ row.unitCostText }}</div>
                                        <div><span class="text-muted-color font-medium">Neden: </span>{{ row.reason }}</div>
                                        <div class="break-words"><span class="text-muted-color font-medium">Not: </span>{{ row.notes }}</div>
                                    </div>
                                </div>
                            }
                        </div>

                        <div class="xl:hidden mt-4">
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

        <app-stock-movement-create-dialog
            [visible]="createDialogOpen()"
            (visibleChange)="createDialogOpen.set($event)"
            (created)="onStockMovementCreated()"
        />
    `
})
export class StockMovementsPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly stockMovementService = inject(StockMovementService);
    private readonly messages = inject(MessageService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canCreateStockMovement = this.auth.hasOperationClaim(STOCK_MOVEMENTS_CREATE_CLAIM);
    readonly canExportStockMovements = computed(() => this.auth.hasOperationClaim(STOCK_MOVEMENTS_READ_CLAIM));
    readonly createDialogOpen = signal(false);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly exporting = signal(false);
    readonly exportError = signal<string | null>(null);

    readonly rawItems = signal<StockMovementVm[]>([]);
    readonly totalItems = signal(0);
    readonly pageSize = signal(10);
    readonly first = signal(0);
    readonly currentPage = signal(1);

    readonly activeSearch = signal('');
    readonly activeMovementType = signal('');
    readonly activeDateFrom = signal('');
    readonly activeDateTo = signal('');

    searchInput = '';
    movementTypeFilter = '';
    dateFromInput = '';
    dateToInput = '';

    readonly movementTypeOptions = [
        { label: 'İlk stok', value: 'Initial' },
        { label: 'Stok girişi', value: 'In' },
        { label: 'Stok çıkışı', value: 'Out' },
        { label: 'Stok düzeltme', value: 'Adjustment' }
    ];

    readonly displayedRows = computed(() => this.rawItems());

    private suppressNextLazy = false;
    private lastLoadKey = '';

    ngOnInit(): void {
        const restored = this.restoreStateFromSessionStorage();
        if (!restored) {
            this.currentPage.set(1);
            this.first.set(0);
        }
        this.suppressNextLazy = true;
        this.loadFromServer(
            this.currentPage(),
            this.pageSize(),
            this.activeSearch(),
            this.activeMovementType(),
            this.activeDateFrom(),
            this.activeDateTo()
        );
    }

    applyFilters(): void {
        this.exportError.set(null);
        let from = this.dateFromInput?.trim() ?? '';
        let to = this.dateToInput?.trim() ?? '';
        if (from && to && from > to) {
            const t = from;
            from = to;
            to = t;
            this.dateFromInput = from;
            this.dateToInput = to;
        }

        this.activeSearch.set(this.searchInput.trim());
        this.activeMovementType.set(String(this.movementTypeFilter ?? '').trim());
        this.activeDateFrom.set(from);
        this.activeDateTo.set(to);
        this.first.set(0);
        this.currentPage.set(1);
        this.persistStateToSessionStorage(1, this.pageSize());
        this.loadFromServer(1, this.pageSize(), this.activeSearch(), this.activeMovementType(), this.activeDateFrom(), this.activeDateTo());
    }

    resetFilters(): void {
        this.exportError.set(null);
        this.searchInput = '';
        this.movementTypeFilter = '';
        this.dateFromInput = '';
        this.dateToInput = '';
        this.activeSearch.set('');
        this.activeMovementType.set('');
        this.activeDateFrom.set('');
        this.activeDateTo.set('');
        this.first.set(0);
        this.currentPage.set(1);
        this.clearStateFromSessionStorage();
        this.loadFromServer(1, this.pageSize(), '', '', '', '');
    }

    reload(): void {
        this.exportError.set(null);
        this.loadFromServer(
            this.currentPage(),
            this.pageSize(),
            this.activeSearch(),
            this.activeMovementType(),
            this.activeDateFrom(),
            this.activeDateTo(),
            true
        );
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
        this.loadFromServer(page, rows, this.activeSearch(), this.activeMovementType(), this.activeDateFrom(), this.activeDateTo());
    }

    onMobilePageChange(state: PaginatorState): void {
        const rows = state.rows ?? this.pageSize();
        const first = state.first ?? 0;
        const page = Math.floor(first / rows) + 1;
        this.suppressNextLazy = true;
        this.persistStateToSessionStorage(page, rows);
        this.loadFromServer(page, rows, this.activeSearch(), this.activeMovementType(), this.activeDateFrom(), this.activeDateTo());
    }

    isSearchActive(): boolean {
        return !!this.activeSearch().trim();
    }

    movementTypeActive(): boolean {
        return !!this.activeMovementType().trim();
    }

    isFromActive(): boolean {
        return !!this.activeDateFrom().trim();
    }

    isToActive(): boolean {
        return !!this.activeDateTo().trim();
    }

    private loadFromServer(
        page: number,
        pageSize: number,
        search: string,
        movementType: string,
        dateFrom: string,
        dateTo: string,
        force = false
    ): void {
        const key = `${page}|${pageSize}|${search.trim()}|${movementType}|${dateFrom}|${dateTo}`;
        if (!force && key === this.lastLoadKey) {
            return;
        }
        this.lastLoadKey = key;
        this.loading.set(true);
        this.error.set(null);
        this.stockMovementService
            .list({
                page,
                pageSize,
                search: search.trim() || undefined,
                movementType: movementType.trim() || undefined,
                dateFromUtc: dateFrom.trim() || undefined,
                dateToUtc: dateTo.trim() || undefined
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
        const raw = sessionStorage.getItem(LIST_STATE_KEY);
        if (!raw) {
            return false;
        }
        try {
            const parsed = JSON.parse(raw) as Partial<StockMovementsListState>;
            const page = Number(parsed.page);
            const pageSize = Number(parsed.pageSize);
            if (!Number.isFinite(page) || page < 1 || !Number.isFinite(pageSize) || pageSize < 1) {
                sessionStorage.removeItem(LIST_STATE_KEY);
                return false;
            }
            this.searchInput = typeof parsed.search === 'string' ? parsed.search : '';
            this.activeSearch.set(this.searchInput.trim());
            this.movementTypeFilter =
                typeof parsed.movementType === 'string' &&
                ['', 'Initial', 'In', 'Out', 'Adjustment'].includes(parsed.movementType)
                    ? parsed.movementType
                    : '';
            this.activeMovementType.set(this.movementTypeFilter);
            this.dateFromInput = typeof parsed.dateFrom === 'string' ? parsed.dateFrom : '';
            this.dateToInput = typeof parsed.dateTo === 'string' ? parsed.dateTo : '';
            this.activeDateFrom.set(this.dateFromInput.trim());
            this.activeDateTo.set(this.dateToInput.trim());
            this.pageSize.set(pageSize);
            this.currentPage.set(page);
            this.first.set((page - 1) * pageSize);
            return true;
        } catch {
            sessionStorage.removeItem(LIST_STATE_KEY);
            return false;
        }
    }

    private persistStateToSessionStorage(page: number, pageSize: number): void {
        const state: StockMovementsListState = {
            search: this.searchInput.trim(),
            movementType: this.activeMovementType(),
            dateFrom: this.dateFromInput.trim(),
            dateTo: this.dateToInput.trim(),
            page,
            pageSize
        };
        sessionStorage.setItem(LIST_STATE_KEY, JSON.stringify(state));
    }

    private clearStateFromSessionStorage(): void {
        sessionStorage.removeItem(LIST_STATE_KEY);
    }

    onStockMovementCreated(): void {
        this.messages.add({
            severity: 'success',
            summary: 'Kaydedildi',
            detail: 'Stok hareketi oluşturuldu.'
        });
        this.reload();
    }

    exportCsv(): void {
        if (!this.auth.hasOperationClaim(STOCK_MOVEMENTS_READ_CLAIM)) {
            return;
        }
        this.exportError.set(null);
        this.exporting.set(true);
        this.fetchAllFilteredStockMovementsForExport().subscribe({
            next: (items) => {
                const rows = items.map((row) => stockMovementVmToCsvRow(row));
                const csv = buildCsvFromStringRows([...STOCK_MOVEMENT_CSV_HEADERS], rows);
                const blob = csvTextToUtf8BlobWithBom(csv);
                const name = `stok-hareketleri-${localDateTimeYyyyMmDd_HHmmForFileName()}.csv`;
                triggerBlobDownload(blob, name);
                this.exporting.set(false);
            },
            error: (e: unknown) => {
                this.exporting.set(false);
                if (e instanceof InventoryCsvExportRowLimitError) {
                    this.exportError.set('Dışa aktarılacak kayıt sayısı çok yüksek. Lütfen filtreleri daraltın.');
                    return;
                }
                this.exportError.set('Stok hareketleri dışa aktarılamadı.');
            }
        });
    }

    private fetchAllFilteredStockMovementsForExport(): Observable<StockMovementVm[]> {
        const search = this.activeSearch().trim();
        const movementType = this.activeMovementType().trim();
        const dateFrom = this.activeDateFrom().trim();
        const dateTo = this.activeDateTo().trim();
        const q = {
            search: search || undefined,
            movementType: movementType || undefined,
            dateFromUtc: dateFrom || undefined,
            dateToUtc: dateTo || undefined
        };
        return fetchAllInventoryCsvExportPages$((page, pageSize) =>
            this.stockMovementService.list({ page, pageSize, ...q })
        );
    }
}
