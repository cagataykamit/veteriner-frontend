import { debouncedAction } from '@/app/shared/ui/search-input/debounced-action';
import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Paginator } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ListPageState } from '@/app/shared/list/list-page-state';
import { ToastModule } from 'primeng/toast';
import type { StockMovementVm } from '@/app/features/inventory/models/stock-movement-vm.model';
import { StockMovementCreateDialogComponent } from '@/app/features/inventory/components/stock-movement-create-dialog/stock-movement-create-dialog.component';
import { StockMovementService } from '@/app/features/inventory/services/stock-movement.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { STOCK_MOVEMENTS_CREATE_CLAIM, STOCK_MOVEMENTS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { buildCsvFromStringRows, csvTextToUtf8BlobWithBom } from '@/app/shared/utils/csv-text.utils';
import { localDateTimeYyyyMmDd_HHmmForFileName } from '@/app/shared/utils/date.utils';
import { triggerBlobDownload } from '@/app/shared/utils/file-download.utils';
import { STOCK_MOVEMENT_CSV_HEADERS, stockMovementVmToCsvRow } from '@/app/features/inventory/utils/stock-movement-export.utils';
import { fetchAllInventoryCsvExportPages$, InventoryCsvExportRowLimitError } from '@/app/features/inventory/utils/inventory-csv-export-pagination.utils';
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
        AppListHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent,
        DateInputComponent,
        FilterFieldComponent,
        SearchInputComponent
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <p-toast position="bottom-right" />

        <div class="card">
            @if (exportError()) {
                <div class="mb-4 border border-red-200 dark:border-red-800 rounded-border p-3">
                    <p class="text-red-500 m-0 text-sm" role="alert">{{ exportError() }}</p>
                </div>
            }

            <div class="flex flex-col gap-4">
                <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                    <app-list-header class="mb-3" title="Stok hareketleri" [count]="totalItems()">
                        <app-filter-field label="Arama" labelFor="smSearch" [active]="isSearchActive()" width="grow">
                            <app-search-input inputId="smSearch" placeholder="Ürün, SKU, kategori, klinik…" [(value)]="searchInput" (searchRequested)="applyFilters()" />
                        </app-filter-field>
                        <button pButton type="button" actions severity="secondary" (click)="resetFilters()" [disabled]="loading()"><i class="p-button-icon pi pi-times"></i>{{ copy.buttonClear }}</button>
                        @if (canExportStockMovements()) {
                            <button pButton type="button" actions severity="help" (click)="exportCsv()" [disabled]="loading() || exporting()"><i class="p-button-icon" [class]="exporting() ? 'pi pi-spin pi-spinner' : 'pi pi-download'"></i>Dışa aktar</button>
                        }
                        @if (canCreateStockMovement && !ro.mutationBlocked()) {
                            <button actions pButton type="button" class="p-button-primary" (click)="createDialogOpen.set(true)"><i class="pi pi-plus"></i>Yeni stok hareketi</button>
                        } @else if (canCreateStockMovement && ro.mutationBlocked()) {
                            <button actions pButton type="button" [disabled]="true" class="p-button-secondary"><i class="pi pi-lock"></i>Yeni stok hareketi (salt okunur)</button>
                        }
                    </app-list-header>
                    <div class="flex flex-wrap items-end gap-3">
                        <app-filter-field label="Hareket tipi" labelId="lblSmType" [active]="movementTypeActive()" width="select">
                            <p-select
                                ariaLabelledBy="lblSmType"
                                inputId="smMovementType"
                                [options]="movementTypeOptions"
                                [(ngModel)]="movementTypeFilter"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Tümü"
                                class="w-full"
                                [showClear]="true"
                                (ngModelChange)="scheduleApply()"
                            />
                        </app-filter-field>
                        <app-filter-field label="Başlangıç (UTC tarih)" labelFor="smFrom" [active]="isFromActive()" width="date">
                            <app-date-input inputId="smFrom" type="date" min="1900-01-01" [(ngModel)]="dateFromInput" limit="past" (ngModelChange)="scheduleApply()" />
                        </app-filter-field>
                        <app-filter-field label="Bitiş (UTC tarih)" labelFor="smTo" [active]="isToActive()" width="date">
                            <app-date-input inputId="smTo" type="date" min="1900-01-01" [(ngModel)]="dateToInput" limit="past" (ngModelChange)="scheduleApply()" />
                        </app-filter-field>
                    </div>
                </div>
                @if (loading()) {
                    <app-loading-state message="Stok hareketleri yükleniyor…" />
                } @else if (error()) {
                    <app-error-state [detail]="error()!" (retry)="reload()" />
                } @else {
                    @if (displayedRows().length === 0) {
                        <app-empty-state [message]="copy.listEmptyMessage" [hint]="copy.listEmptyHint" />
                    } @else {
                        <div class="hidden xl:block overflow-x-auto">
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
                                                <a [routerLink]="['/panel/products', row.productId]" class="text-primary font-medium no-underline">{{ row.productDisplayName }}</a>
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
                                <div class="rounded-border border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4 shadow-sm">
                                    <div class="text-sm font-medium text-surface-900 dark:text-surface-0 mb-2 whitespace-nowrap">{{ row.occurredAtText }}</div>
                                    <div class="space-y-2 mb-3 text-sm">
                                        <div>
                                            <span class="text-muted-color font-medium">Ürün: </span>
                                            @if (row.productId) {
                                                <a [routerLink]="['/panel/products', row.productId]" class="text-primary font-medium no-underline break-words">{{ row.productDisplayName }}</a>
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
                                [rowsPerPageOptions]="rowsPerPageOptions"
                                (onPageChange)="list.onMobilePageChange($event)"
                            />
                        </div>
                    }
                }
            </div>
        </div>

        <app-stock-movement-create-dialog [visible]="createDialogOpen()" (visibleChange)="createDialogOpen.set($event)" (created)="onStockMovementCreated()" />
    `
})
export class StockMovementsPageComponent implements OnInit {
    protected readonly scheduleApply = debouncedAction(() => this.applyFilters());
    readonly copy = PANEL_COPY;

    private readonly stockMovementService = inject(StockMovementService);
    private readonly messages = inject(MessageService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canCreateStockMovement = this.auth.hasOperationClaim(STOCK_MOVEMENTS_CREATE_CLAIM);
    readonly canExportStockMovements = computed(() => this.auth.hasOperationClaim(STOCK_MOVEMENTS_READ_CLAIM));
    readonly createDialogOpen = signal(false);

    readonly list = new ListPageState<StockMovementVm>({
        fetch: (page, pageSize) =>
            this.stockMovementService
                .list({
                    page,
                    pageSize,
                    search: this.activeSearch().trim() || undefined,
                    movementType: this.activeMovementType().trim() || undefined,
                    dateFromUtc: this.activeDateFrom().trim() || undefined,
                    dateToUtc: this.activeDateTo().trim() || undefined
                }),
        loadKey: (page, pageSize) => `${page}|${pageSize}|${this.activeSearch().trim()}|${this.activeMovementType()}|${this.activeDateFrom()}|${this.activeDateTo()}`,
        persist: {
            key: LIST_STATE_KEY,
            save: (): Omit<StockMovementsListState, 'page' | 'pageSize'> => ({
                search: this.searchInput.trim(),
                movementType: this.activeMovementType(),
                dateFrom: this.dateFromInput.trim(),
                dateTo: this.dateToInput.trim()
            }),
            restore: (state) => {
                const parsed = state as Partial<StockMovementsListState>;

                this.searchInput = typeof parsed.search === 'string' ? parsed.search : '';
                this.activeSearch.set(this.searchInput.trim());
                this.movementTypeFilter = typeof parsed.movementType === 'string' && ['', 'Initial', 'In', 'Out', 'Adjustment', 'Reversal'].includes(parsed.movementType) ? parsed.movementType : '';
                this.activeMovementType.set(this.movementTypeFilter);
                this.dateFromInput = typeof parsed.dateFrom === 'string' ? parsed.dateFrom : '';
                this.dateToInput = typeof parsed.dateTo === 'string' ? parsed.dateTo : '';
                this.activeDateFrom.set(this.dateFromInput.trim());
                this.activeDateTo.set(this.dateToInput.trim());
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
        { label: 'Stok düzeltme', value: 'Adjustment' },
        { label: 'Geri alma (iade)', value: 'Reversal' }
    ];

    readonly displayedRows = computed(() => this.rawItems());

    ngOnInit(): void {
        const restored = this.list.restore();

        if (!restored) {
            this.list.goToFirstPage();
        }

        this.list.startInitialLoad();
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
        this.list.loadFirstPage();
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
        this.list.resetToFirstPage();
    }

    reload(): void {
        this.exportError.set(null);
        this.list.reload();
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

        return fetchAllInventoryCsvExportPages$((page, pageSize) => this.stockMovementService.list({ page, pageSize, ...q }));
    }
}
