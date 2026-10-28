import { debouncedAction } from '@/app/shared/ui/search-input/debounced-action';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { Paginator } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import type { StockMovementVm } from '@/app/features/inventory/models/stock-movement-vm.model';
import { StockMovementCreateDialogComponent } from '@/app/features/inventory/components/stock-movement-create-dialog/stock-movement-create-dialog.component';
import { ListPageState } from '@/app/shared/list/list-page-state';
import { ProductService } from '@/app/entities/inventory/services/product.service';
import { StockMovementService } from '@/app/features/inventory/services/stock-movement.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
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
import { STOCK_MOVEMENT_CSV_HEADERS, stockMovementVmToCsvRow } from '@/app/features/inventory/utils/stock-movement-export.utils';
import { fetchAllInventoryCsvExportPages$, InventoryCsvExportRowLimitError } from '@/app/features/inventory/utils/inventory-csv-export-pagination.utils';
import { EMPTY, catchError, of, switchMap, tap, type Observable } from 'rxjs';

type ProductStockMovementsListState = {
    movementType: string;
    dateFrom: string;
    dateTo: string;
    page: number;
    pageSize: number;
};

@Component({
    selector: 'app-product-stock-movements-page',
    standalone: true,
    providers: [MessageService],
    imports: [
        CommonModule,
        FormsModule,
        FilterFieldComponent,
        TableModule,
        Paginator,
        ButtonModule,
        SelectModule,
        ToastModule,
        StockMovementCreateDialogComponent,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent,
        DateInputComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-toast position="bottom-right" />

        <app-page-header [categoryLink]="productDetailLink()" categoryLinkLabel="Ürün detayına dön" title="Ürün stok hareketleri" description="Bu ürüne ait stok hareketleri; liste salt okunur. Yetkiniz varsa yeni kayıt ekleyebilirsiniz.">
            @if (canCreateStockMovement && !ro.mutationBlocked()) {
                <button actions pButton type="button" class="p-button-primary" (click)="createDialogOpen.set(true)"><i class="pi pi-plus"></i>Bu ürün için stok hareketi ekle</button>
            } @else if (canCreateStockMovement && ro.mutationBlocked()) {
                <button actions pButton type="button" [disabled]="true" class="p-button-secondary"><i class="pi pi-lock"></i>Stok hareketi (salt okunur)</button>
            }
        </app-page-header>

        <div class="card">
            @if (exportError()) {
                <div class="mb-4 border border-red-200 dark:border-red-800 rounded-border p-3">
                    <p class="text-red-500 m-0 text-sm" role="alert">{{ exportError() }}</p>
                </div>
            }

            @if (routeError()) {
                <app-error-state [detail]="routeError()!" />
            } @else if (loading()) {
                <app-loading-state message="Stok hareketleri yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else {
                <div class="flex flex-col gap-4">
                    <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                        <div class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3 mb-3">
                            <div class="min-w-0">
                                <h5 class="m-0">Hareketler</h5>
                                @if (totalItems() > 0) {
                                    <span class="text-sm text-muted-color whitespace-nowrap">{{ totalItems() }} kayıt</span>
                                }
                            </div>
                            <div class="flex flex-wrap gap-2 shrink-0">
                                <button pButton type="button" severity="secondary" (click)="resetFilters()" [disabled]="loading()"><i class="p-button-icon pi pi-times"></i>{{ copy.buttonClear }}</button>
                                @if (canExportStockMovements()) {
                                    <button pButton type="button" severity="help" (click)="exportCsv()" [disabled]="loading() || exporting()"><i class="p-button-icon" [class]="exporting() ? 'pi pi-spin pi-spinner' : 'pi pi-download'"></i>Dışa aktar</button>
                                }
                            </div>
                        </div>
                        <div class="flex flex-wrap items-end gap-3">
                            <app-filter-field label="Hareket tipi" labelId="lblPsmType" [active]="movementTypeActive()" width="select">
                                <p-select
                                    ariaLabelledBy="lblPsmType"
                                    inputId="psmMovementType"
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
                            <app-filter-field label="Başlangıç (UTC tarih)" labelFor="psmFrom" [active]="isFromActive()" width="date">
                                <app-date-input inputId="psmFrom" type="date" min="1900-01-01" [(ngModel)]="dateFromInput" limit="past" (ngModelChange)="scheduleApply()" />
                            </app-filter-field>
                            <app-filter-field label="Bitiş (UTC tarih)" labelFor="psmTo" [active]="isToActive()" width="date">
                                <app-date-input inputId="psmTo" type="date" min="1900-01-01" [(ngModel)]="dateToInput" limit="past" (ngModelChange)="scheduleApply()" />
                            </app-filter-field>
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
                                        <td>{{ row.productDisplayName }}</td>
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
                                    <div class="text-sm font-medium mb-2 whitespace-nowrap">{{ row.occurredAtText }}</div>
                                    <div class="space-y-2 text-sm">
                                        <div><span class="text-muted-color font-medium">Ürün: </span>{{ row.productDisplayName }}</div>
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
                </div>
            }
        </div>

        <app-stock-movement-create-dialog [visible]="createDialogOpen()" (visibleChange)="createDialogOpen.set($event)" [fixedProductId]="productId()" [fixedProductLabel]="productLabel()" (created)="onStockMovementCreated()" />
    `
})
export class ProductStockMovementsPageComponent implements OnInit {
    protected readonly scheduleApply = debouncedAction(() => this.applyFilters());
    readonly copy = PANEL_COPY;

    private readonly route = inject(ActivatedRoute);
    private readonly stockMovementService = inject(StockMovementService);
    private readonly productService = inject(ProductService);
    private readonly messages = inject(MessageService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canCreateStockMovement = this.auth.hasOperationClaim(STOCK_MOVEMENTS_CREATE_CLAIM);
    readonly canExportStockMovements = computed(() => this.auth.hasOperationClaim(STOCK_MOVEMENTS_READ_CLAIM));
    readonly createDialogOpen = signal(false);

    readonly productId = signal<string | null>(null);
    readonly productLabel = signal<string | null>(null);

    readonly list = new ListPageState<StockMovementVm>({
        fetch: (page, pageSize) =>
            this.stockMovementService.listByProductId(this.productId() ?? '', {
                page,
                pageSize,
                movementType: this.activeMovementType().trim() || undefined,
                dateFromUtc: this.activeDateFrom().trim() || undefined,
                dateToUtc: this.activeDateTo().trim() || undefined
            }),
        loadKey: (page, pageSize) => `${this.productId()}|${page}|${pageSize}|${this.activeMovementType()}|${this.activeDateFrom()}|${this.activeDateTo()}`,
        persist: {
            key: () => `panel:inventory:product-stock-movements:${this.productId()}:listState`,
            save: (): Omit<ProductStockMovementsListState, 'page' | 'pageSize'> => ({
                movementType: this.activeMovementType(),
                dateFrom: this.dateFromInput.trim(),
                dateTo: this.dateToInput.trim()
            }),
            restore: (state) => {
                const parsed = state as Partial<ProductStockMovementsListState>;

                this.movementTypeFilter = typeof parsed.movementType === 'string' && ['', 'Initial', 'In', 'Out', 'Adjustment', 'Reversal'].includes(parsed.movementType) ? parsed.movementType : '';
                this.activeMovementType.set(this.movementTypeFilter);
                this.dateFromInput = typeof parsed.dateFrom === 'string' ? parsed.dateFrom : '';
                this.dateToInput = typeof parsed.dateTo === 'string' ? parsed.dateTo : '';
                this.activeDateFrom.set(this.dateFromInput.trim());
                this.activeDateTo.set(this.dateToInput.trim());
            }
        }
    });

    readonly routeError = signal<string | null>(null);
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

    readonly activeMovementType = signal('');
    readonly activeDateFrom = signal('');
    readonly activeDateTo = signal('');

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

    readonly productDetailLink = () => {
        const id = this.productId();

        return id ? ['/panel/products', id] : ['/panel/products'];
    };

    ngOnInit(): void {
        this.route.paramMap
            .pipe(
                switchMap((params) => {
                    const id = params.get('id')?.trim();

                    if (!id) {
                        this.routeError.set('Geçersiz ürün.');
                        this.loading.set(false);

                        return EMPTY;
                    }

                    this.routeError.set(null);
                    this.productId.set(id);
                    this.productLabel.set(null);
                    this.error.set(null);

                    if (!this.list.restore()) {
                        this.list.goToFirstPage();
                    }

                    this.loading.set(true);

                    return this.productService.getById(id).pipe(
                        tap((p) => this.productLabel.set(`${p.name} (${p.sku})`)),
                        catchError(() => {
                            this.productLabel.set(null);

                            return of(undefined);
                        })
                    );
                })
            )
            .subscribe(() => this.list.startInitialLoad());
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

        this.activeMovementType.set(String(this.movementTypeFilter ?? '').trim());
        this.activeDateFrom.set(from);
        this.activeDateTo.set(to);

        if (this.canLoad()) {
            this.list.loadFirstPage();
        }
    }

    resetFilters(): void {
        this.exportError.set(null);
        this.movementTypeFilter = '';
        this.dateFromInput = '';
        this.dateToInput = '';
        this.activeMovementType.set('');
        this.activeDateFrom.set('');
        this.activeDateTo.set('');

        if (this.canLoad()) {
            this.list.resetToFirstPage();
        }
    }

    reload(): void {
        this.exportError.set(null);

        if (this.canLoad()) {
            this.list.reload();
        }
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

    /** Liste yalnız geçerli ürün rotasında yüklenir. */
    private canLoad(): boolean {
        return !!this.productId() && !this.routeError();
    }

    onStockMovementCreated(): void {
        this.messages.add({
            severity: 'success',
            summary: 'Kaydedildi',
            detail: 'Stok hareketi oluşturuldu.'
        });

        if (this.canLoad()) {
            this.list.reload();
        }
    }

    exportCsv(): void {
        if (!this.auth.hasOperationClaim(STOCK_MOVEMENTS_READ_CLAIM)) {
            return;
        }

        const id = this.productId();

        if (!id || this.routeError()) {
            return;
        }

        this.exportError.set(null);
        this.exporting.set(true);
        this.fetchAllFilteredProductStockMovementsForExport(id).subscribe({
            next: (items) => {
                const rows = items.map((row) => stockMovementVmToCsvRow(row));
                const csv = buildCsvFromStringRows([...STOCK_MOVEMENT_CSV_HEADERS], rows);
                const blob = csvTextToUtf8BlobWithBom(csv);
                const name = `urun-stok-hareketleri-${localDateTimeYyyyMmDd_HHmmForFileName()}.csv`;

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

    private fetchAllFilteredProductStockMovementsForExport(productId: string): Observable<StockMovementVm[]> {
        const movementType = this.activeMovementType().trim();
        const dateFrom = this.activeDateFrom().trim();
        const dateTo = this.activeDateTo().trim();
        const q = {
            movementType: movementType || undefined,
            dateFromUtc: dateFrom || undefined,
            dateToUtc: dateTo || undefined
        };

        return fetchAllInventoryCsvExportPages$((page, pageSize) => this.stockMovementService.listByProductId(productId, { page, pageSize, ...q }));
    }
}
