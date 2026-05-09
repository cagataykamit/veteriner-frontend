import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Paginator } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/types/paginator';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import type { StockMovementVm } from '@/app/features/inventory/models/stock-movement-vm.model';
import { StockMovementService } from '@/app/features/inventory/services/stock-movement.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { EMPTY, switchMap } from 'rxjs';

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
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        TableModule,
        Paginator,
        ButtonModule,
        SelectModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    template: `
        <a [routerLink]="productDetailLink()" class="text-primary font-medium no-underline inline-block mb-4">← Ürün detayına dön</a>

        <app-page-header
            title="Ürün stok hareketleri"
            subtitle="Ürün ve Stok"
            description="Bu ürüne ait stok hareketleri (salt okunur)."
        />

        <div class="card">
            @if (routeError()) {
                <app-error-state [detail]="routeError()!" />
            } @else if (loading()) {
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
                            <div class="flex flex-wrap gap-2 shrink-0">
                                <p-button [label]="copy.buttonSearch" icon="pi pi-search" (onClick)="applyFilters()" [disabled]="loading()" />
                                <p-button [label]="copy.buttonClear" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
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
                                    id="lblPsmType"
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
                                    ariaLabelledBy="lblPsmType"
                                    inputId="psmMovementType"
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
                                <label for="psmFrom" class="block text-xs font-medium text-muted-color mb-1">Başlangıç (UTC tarih)</label>
                                <input id="psmFrom" type="date" class="w-full p-inputtext p-component" [(ngModel)]="dateFromInput" />
                            </div>
                            <div
                                class="col-span-12 md:col-span-4 rounded-lg border p-2 transition-colors"
                                [ngClass]="
                                    isToActive()
                                        ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
                                        : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900'
                                "
                            >
                                <label for="psmTo" class="block text-xs font-medium text-muted-color mb-1">Bitiş (UTC tarih)</label>
                                <input id="psmTo" type="date" class="w-full p-inputtext p-component" [(ngModel)]="dateToInput" />
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
                                <div
                                    class="rounded-border border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4 shadow-sm"
                                >
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
export class ProductStockMovementsPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly route = inject(ActivatedRoute);
    private readonly stockMovementService = inject(StockMovementService);

    readonly productId = signal<string | null>(null);

    readonly routeError = signal<string | null>(null);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);

    readonly rawItems = signal<StockMovementVm[]>([]);
    readonly totalItems = signal(0);
    readonly pageSize = signal(10);
    readonly first = signal(0);
    readonly currentPage = signal(1);

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
        { label: 'Stok düzeltme', value: 'Adjustment' }
    ];

    readonly displayedRows = computed(() => this.rawItems());

    private suppressNextLazy = false;
    private lastLoadKey = '';

    readonly productDetailLink = () => {
        const id = this.productId();
        return id ? ['/panel/products', id] : ['/panel/products'];
    };

    private sessionKey(): string {
        const id = this.productId();
        return id ? `panel:inventory:product-stock-movements:${id}:listState` : '';
    }

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
                    this.error.set(null);
                    this.suppressNextLazy = true;
                    const restored = this.restoreStateFromSessionStorage(id);
                    if (!restored) {
                        this.currentPage.set(1);
                        this.first.set(0);
                    }
                    this.loading.set(true);
                    return this.stockMovementService.listByProductId(id, this.buildQueryFromSignals());
                })
            )
            .subscribe({
                next: (r) => {
                    this.rawItems.set(r.items);
                    this.totalItems.set(r.totalItems);
                    this.pageSize.set(r.pageSize);
                    this.currentPage.set(r.page);
                    this.first.set((r.page - 1) * r.pageSize);
                    this.persistStateToSessionStorage(r.page, r.pageSize);
                    const pid = this.productId();
                    if (pid) {
                        this.lastLoadKey = `${pid}|${r.page}|${r.pageSize}|${this.activeMovementType()}|${this.activeDateFrom()}|${this.activeDateTo()}`;
                    }
                    this.loading.set(false);
                    this.suppressNextLazy = true;
                },
                error: (e: Error) => {
                    this.error.set(e.message ?? 'Yükleme hatası');
                    this.loading.set(false);
                    this.suppressNextLazy = true;
                }
            });
    }

    private buildQueryFromSignals(): Parameters<StockMovementService['listByProductId']>[1] {
        return {
            page: this.currentPage(),
            pageSize: this.pageSize(),
            movementType: this.activeMovementType().trim() || undefined,
            dateFromUtc: this.activeDateFrom().trim() || undefined,
            dateToUtc: this.activeDateTo().trim() || undefined
        };
    }

    applyFilters(): void {
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
        this.first.set(0);
        this.currentPage.set(1);
        this.persistStateToSessionStorage(1, this.pageSize());
        this.reloadWithCurrentFilters();
    }

    resetFilters(): void {
        this.movementTypeFilter = '';
        this.dateFromInput = '';
        this.dateToInput = '';
        this.activeMovementType.set('');
        this.activeDateFrom.set('');
        this.activeDateTo.set('');
        this.first.set(0);
        this.currentPage.set(1);
        this.clearStateFromSessionStorage();
        this.reloadWithCurrentFilters();
    }

    reload(): void {
        this.reloadWithCurrentFilters(true);
    }

    private reloadWithCurrentFilters(force = false): void {
        const id = this.productId();
        if (!id || this.routeError()) {
            return;
        }
        const key = `${id}|${this.currentPage()}|${this.pageSize()}|${this.activeMovementType()}|${this.activeDateFrom()}|${this.activeDateTo()}`;
        if (!force && key === this.lastLoadKey) {
            return;
        }
        this.lastLoadKey = key;
        this.loading.set(true);
        this.error.set(null);
        this.stockMovementService
            .listByProductId(id, {
                page: this.currentPage(),
                pageSize: this.pageSize(),
                movementType: this.activeMovementType().trim() || undefined,
                dateFromUtc: this.activeDateFrom().trim() || undefined,
                dateToUtc: this.activeDateTo().trim() || undefined
            })
            .subscribe({
                next: (r) => {
                    this.rawItems.set(r.items);
                    this.totalItems.set(r.totalItems);
                    this.pageSize.set(r.pageSize);
                    this.currentPage.set(r.page);
                    this.first.set((r.page - 1) * r.pageSize);
                    this.persistStateToSessionStorage(r.page, r.pageSize);
                    const pid = this.productId();
                    if (pid) {
                        this.lastLoadKey = `${pid}|${r.page}|${r.pageSize}|${this.activeMovementType()}|${this.activeDateFrom()}|${this.activeDateTo()}`;
                    }
                    this.loading.set(false);
                    this.suppressNextLazy = true;
                },
                error: (e: Error) => {
                    this.error.set(e.message ?? 'Yükleme hatası');
                    this.loading.set(false);
                }
            });
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
        this.currentPage.set(page);
        this.pageSize.set(rows);
        this.first.set(first);
        this.reloadWithCurrentFilters(true);
    }

    onMobilePageChange(state: PaginatorState): void {
        const rows = state.rows ?? this.pageSize();
        const first = state.first ?? 0;
        const page = Math.floor(first / rows) + 1;
        this.suppressNextLazy = true;
        this.persistStateToSessionStorage(page, rows);
        this.currentPage.set(page);
        this.pageSize.set(rows);
        this.first.set(first);
        this.reloadWithCurrentFilters(true);
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

    private restoreStateFromSessionStorage(productId: string): boolean {
        const raw = sessionStorage.getItem(`panel:inventory:product-stock-movements:${productId}:listState`);
        if (!raw) {
            return false;
        }
        try {
            const parsed = JSON.parse(raw) as Partial<ProductStockMovementsListState>;
            const page = Number(parsed.page);
            const pageSize = Number(parsed.pageSize);
            if (!Number.isFinite(page) || page < 1 || !Number.isFinite(pageSize) || pageSize < 1) {
                sessionStorage.removeItem(`panel:inventory:product-stock-movements:${productId}:listState`);
                return false;
            }
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
            sessionStorage.removeItem(`panel:inventory:product-stock-movements:${productId}:listState`);
            return false;
        }
    }

    private persistStateToSessionStorage(page: number, pageSize: number): void {
        const key = this.sessionKey();
        if (!key) {
            return;
        }
        const state: ProductStockMovementsListState = {
            movementType: this.activeMovementType(),
            dateFrom: this.dateFromInput.trim(),
            dateTo: this.dateToInput.trim(),
            page,
            pageSize
        };
        sessionStorage.setItem(key, JSON.stringify(state));
    }

    private clearStateFromSessionStorage(): void {
        const key = this.sessionKey();
        if (key) {
            sessionStorage.removeItem(key);
        }
    }
}
