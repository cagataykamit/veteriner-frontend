import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Paginator } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/types/paginator';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import type { PaymentListItemVm } from '@/app/features/payments/models/payment-vm.model';
import { PaymentsService } from '@/app/features/payments/services/payments.service';
import { paymentMethodLabel } from '@/app/features/payments/utils/payment-method.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { PAYMENTS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';

type PaymentsListState = {
    search: string;
    method: string;
    fromDate: string;
    toDate: string;
    page: number;
    pageSize: number;
};

const PAYMENTS_LIST_STATE_KEY = 'panel:payments:listState';

@Component({
    selector: 'app-payments-list-page',
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
        AppErrorStateComponent
    ],
    template: `
        <app-page-header title="Ödemeler" subtitle="Finans" description="Ödeme kayıtları.">
            @if (canCreatePayment && !ro.mutationBlocked()) {
                <a actions routerLink="/panel/payments/new" pButton type="button" label="Yeni Ödeme" icon="pi pi-plus" class="p-button-primary"></a>
            } @else if (canCreatePayment && ro.mutationBlocked()) {
                <button
                    actions
                    pButton
                    type="button"
                    label="Yeni Ödeme (salt okunur)"
                    icon="pi pi-lock"
                    [disabled]="true"
                    class="p-button-secondary"
                ></button>
            }
        </app-page-header>

        <div class="card">
            @if (loading()) {
                <app-loading-state message="Ödeme listesi yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else {
                <div class="flex flex-col gap-4">
                    <div class="pb-3 border-b border-surface-200 dark:border-surface-700">
                        <div class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3 mb-3">
                            <div class="min-w-0">
                                <h5 class="m-0">Ödemeler</h5>
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
                                        for="paySearch"
                                        class="flex items-center gap-2 text-xs font-medium mb-1"
                                        [ngClass]="isSearchActive() ? 'text-primary-800 dark:text-primary-200' : 'text-muted-color'"
                                    >
                                        Arama
                                        @if (isSearchActive()) {
                                            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100">
                                                Aktif
                                            </span>
                                        }
                                    </label>
                                    <input
                                        pInputText
                                        id="paySearch"
                                        class="w-full"
                                        [ngClass]="isSearchActive() ? 'border-primary-300 dark:border-primary-600 bg-primary-50/30 dark:bg-primary-900/15' : ''"
                                        [(ngModel)]="searchInput"
                                        placeholder="Not, para birimi; müşteri, hayvan, tür veya ırk, e-posta, telefon…"
                                        (keyup.enter)="applySearch()"
                                    />
                                </div>
                                <div class="flex flex-wrap gap-2 shrink-0">
                                    <p-button [label]="copy.buttonSearch" icon="pi pi-search" (onClick)="applySearch()" [disabled]="loading()" />
                                    <p-button [label]="copy.buttonClear" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-12 gap-3 items-end">
                            <div
                                class="col-span-12 md:col-span-4 rounded-lg border p-2 transition-colors"
                                [ngClass]="
                                    isMethodActive()
                                        ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
                                        : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900'
                                "
                            >
                                <span
                                    id="lblPayMethod"
                                    class="flex items-center gap-2 text-xs font-medium mb-1"
                                    [ngClass]="isMethodActive() ? 'text-primary-800 dark:text-primary-200' : 'text-muted-color'"
                                >
                                    Yöntem
                                    @if (isMethodActive()) {
                                        <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100">
                                            Aktif
                                        </span>
                                    }
                                </span>
                                <p-select
                                    ariaLabelledBy="lblPayMethod"
                                    inputId="payMethod"
                                    [options]="methodOptions"
                                    [(ngModel)]="methodFilter"
                                    optionLabel="label"
                                    optionValue="value"
                                    [placeholder]="copy.filterPlaceholderAll"
                                    styleClass="w-full"
                                    [showClear]="true"
                                />
                            </div>
                            <div
                                class="col-span-12 md:col-span-4 rounded-lg border p-2 transition-colors"
                                [ngClass]="
                                    isFromDateActive()
                                        ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
                                        : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900'
                                "
                            >
                                <label
                                    for="payFrom"
                                    class="flex items-center gap-2 text-xs font-medium mb-1"
                                    [ngClass]="isFromDateActive() ? 'text-primary-800 dark:text-primary-200' : 'text-muted-color'"
                                >
                                    Ödeme tarihi (başlangıç)
                                    @if (isFromDateActive()) {
                                        <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100">
                                            Aktif
                                        </span>
                                    }
                                </label>
                                <input
                                    id="payFrom"
                                    type="date"
                                    class="w-full p-inputtext p-component"
                                    [ngClass]="isFromDateActive() ? 'border-primary-300 dark:border-primary-600 bg-primary-50/30 dark:bg-primary-900/15' : ''"
                                    [(ngModel)]="fromDateInput"
                                />
                            </div>
                            <div
                                class="col-span-12 md:col-span-4 rounded-lg border p-2 transition-colors"
                                [ngClass]="
                                    isToDateActive()
                                        ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
                                        : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900'
                                "
                            >
                                <label
                                    for="payTo"
                                    class="flex items-center gap-2 text-xs font-medium mb-1"
                                    [ngClass]="isToDateActive() ? 'text-primary-800 dark:text-primary-200' : 'text-muted-color'"
                                >
                                    Ödeme tarihi (bitiş)
                                    @if (isToDateActive()) {
                                        <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100">
                                            Aktif
                                        </span>
                                    }
                                </label>
                                <input
                                    id="payTo"
                                    type="date"
                                    class="w-full p-inputtext p-component"
                                    [ngClass]="isToDateActive() ? 'border-primary-300 dark:border-primary-600 bg-primary-50/30 dark:bg-primary-900/15' : ''"
                                    [(ngModel)]="toDateInput"
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
                            [rowsPerPageOptions]="rowsPerPageOptions"
                            [paginatorDropdownAppendTo]="'body'"
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
                                    <th>Müşteri</th>
                                    <th>Hayvan</th>
                                    <th class="text-right">Tutar</th>
                                    <th>Para birimi</th>
                                    <th>Yöntem</th>
                                    <th>Ödeme tarihi</th>
                                    <th style="width: 8rem">İşlemler</th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-row>
                                <tr>
                                    <td>
                                        @if (row.clientId) {
                                            <a [routerLink]="['/panel/clients', row.clientId]" class="text-primary font-medium no-underline">{{
                                                row.clientName
                                            }}</a>
                                        } @else {
                                            {{ row.clientName }}
                                        }
                                    </td>
                                    <td>
                                        @if (row.petId) {
                                            <a [routerLink]="['/panel/pets', row.petId]" class="text-primary font-medium no-underline">{{ row.petName }}</a>
                                        } @else {
                                            {{ row.petName }}
                                        }
                                    </td>
                                    <td class="text-right font-medium">{{ money(row.amount, row.currency) }}</td>
                                    <td>{{ row.currency }}</td>
                                    <td>{{ methodLabel(row.method) }}</td>
                                    <td>{{ formatPaidAtUtc(row.paidAtUtc) }}</td>
                                    <td>
                                        <a [routerLink]="['/panel/payments', row.id]" class="text-primary font-medium no-underline">Detay</a>
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
                                    {{ formatPaidAtUtc(row.paidAtUtc) }}
                                </div>
                                <div class="space-y-2 mb-3 min-w-0">
                                    <div class="text-sm">
                                        <span class="text-muted-color font-medium">Müşteri: </span>
                                        @if (row.clientId) {
                                            <a [routerLink]="['/panel/clients', row.clientId]" class="text-primary font-medium no-underline break-words">{{
                                                row.clientName
                                            }}</a>
                                        } @else {
                                            <span class="break-words">{{ row.clientName }}</span>
                                        }
                                    </div>
                                    <div class="text-sm">
                                        <span class="text-muted-color font-medium">Hayvan: </span>
                                        @if (row.petId) {
                                            <a [routerLink]="['/panel/pets', row.petId]" class="text-primary font-medium no-underline break-words">{{
                                                row.petName
                                            }}</a>
                                        } @else {
                                            <span class="break-words">{{ row.petName }}</span>
                                        }
                                    </div>
                                </div>
                                <div class="text-sm font-medium mb-2 min-w-0 break-words">
                                    {{ money(row.amount, row.currency) }}
                                    <span class="text-muted-color font-normal"> {{ row.currency }}</span>
                                </div>
                                <div class="text-sm text-muted-color mb-3 min-w-0">
                                    <span class="font-medium">Yöntem: </span>{{ methodLabel(row.method) }}
                                </div>
                                <div class="flex justify-end pt-1 border-t border-surface-200 dark:border-surface-700">
                                    <a [routerLink]="['/panel/payments', row.id]" class="text-primary font-medium no-underline">Detay →</a>
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
                            (onPageChange)="onMobilePageChange($event)"
                        />
                    </div>
                }
                </div>
            }
        </div>
    `
})
export class PaymentsListPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    readonly ro = inject(TenantReadOnlyContextService);
    private readonly auth = inject(AuthService);

    private readonly paymentsService = inject(PaymentsService);

    /** İlk yüklemede boş tablo flaşını önlemek için true başlar. */
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);

    readonly rawItems = signal<PaymentListItemVm[]>([]);
    readonly totalItems = signal(0);
    readonly rowsPerPageOptions = [10, 20, 25, 50];
    readonly pageSize = signal(10);
    readonly first = signal(0);
    readonly currentPage = signal(1);

    readonly activeSearch = signal('');
    readonly activeFromDate = signal('');
    readonly activeToDate = signal('');

    searchInput = '';
    fromDateInput = '';
    toDateInput = '';
    methodFilter = '';

    readonly methodOptions = [
        { label: 'Tümü', value: '' },
        { label: 'Nakit', value: 'cash' },
        { label: 'Kart', value: 'card' },
        { label: 'Havale / EFT', value: 'transfer' }
    ];
    readonly canCreatePayment = this.auth.hasOperationClaim(PAYMENTS_CREATE_CLAIM);

    readonly displayedRows = computed(() => this.rawItems());

    readonly formatPaidAtUtc = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly money = (amount: number | null, currency: string) => formatMoney(amount, currency || 'TRY');
    readonly methodLabel = paymentMethodLabel;
    readonly hasActiveFilters = computed(
        () => !!this.activeSearch().trim() || !!this.methodFilter.trim() || !!this.activeFromDate().trim() || !!this.activeToDate().trim()
    );
    private suppressNextLazy = false;
    private lastLoadKey = '';

    ngOnInit(): void {
        const restored = this.restoreStateFromSessionStorage();
        if (!restored) {
            this.currentPage.set(1);
            this.first.set(0);
        }
        this.suppressNextLazy = true;
        this.loadFromServer(this.currentPage(), this.pageSize(), this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.methodFilter);
    }

    applySearch(): void {
        let from = this.fromDateInput?.trim() ?? '';
        let to = this.toDateInput?.trim() ?? '';
        if (from && to && from > to) {
            const t = from;
            from = to;
            to = t;
            this.fromDateInput = from;
            this.toDateInput = to;
        }

        this.activeSearch.set(this.searchInput.trim());
        this.activeFromDate.set(from);
        this.activeToDate.set(to);
        this.first.set(0);
        this.currentPage.set(1);
        this.persistStateToSessionStorage(1, this.pageSize());
        this.loadFromServer(1, this.pageSize(), this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.methodFilter);
    }

    resetFilters(): void {
        this.searchInput = '';
        this.fromDateInput = '';
        this.toDateInput = '';
        this.activeSearch.set('');
        this.activeFromDate.set('');
        this.activeToDate.set('');
        this.methodFilter = '';
        this.first.set(0);
        this.currentPage.set(1);
        this.clearStateFromSessionStorage();
        this.loadFromServer(1, this.pageSize(), '', '', '', '');
    }

    reload(): void {
        this.loadFromServer(
            this.currentPage(),
            this.pageSize(),
            this.activeSearch(),
            this.activeFromDate(),
            this.activeToDate(),
            this.methodFilter,
            true
        );
    }

    onTableLazyLoad(event: TableLazyLoadEvent): void {
        if (this.suppressNextLazy) {
            this.suppressNextLazy = false;
            return;
        }
        const rows = event.rows ?? this.pageSize();
        const eventFirst = event.first ?? 0;
        const rowsChanged = rows !== this.pageSize();

        if (rowsChanged) {
            this.first.set(0);
            this.currentPage.set(1);
            this.persistStateToSessionStorage(1, rows);
            this.loadFromServer(1, rows, this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.methodFilter);
            return;
        }

        const page = Math.floor(eventFirst / rows) + 1;
        this.persistStateToSessionStorage(page, rows);
        this.loadFromServer(page, rows, this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.methodFilter);
    }

    onMobilePageChange(state: PaginatorState): void {
        const rows = state.rows ?? this.pageSize();
        const eventFirst = state.first ?? 0;
        const rowsChanged = rows !== this.pageSize();
        this.suppressNextLazy = true;

        if (rowsChanged) {
            this.first.set(0);
            this.currentPage.set(1);
            this.persistStateToSessionStorage(1, rows);
            this.loadFromServer(1, rows, this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.methodFilter);
            return;
        }

        const page = Math.floor(eventFirst / rows) + 1;
        this.persistStateToSessionStorage(page, rows);
        this.loadFromServer(page, rows, this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.methodFilter);
    }

    private loadFromServer(
        page: number,
        pageSize: number,
        search: string,
        fromDate: string,
        toDate: string,
        method: string,
        force = false
    ): void {
        const key = `${page}|${pageSize}|${search.trim()}|${fromDate.trim()}|${toDate.trim()}|${method.trim()}`;
        if (!force && key === this.lastLoadKey) {
            return;
        }
        this.lastLoadKey = key;
        this.loading.set(true);
        this.error.set(null);
        this.paymentsService
            .getPayments({
                page,
                pageSize,
                search: search || undefined,
                paidFromDate: fromDate || undefined,
                paidToDate: toDate || undefined,
                method: method || undefined
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

    isSearchActive(): boolean {
        return !!this.activeSearch().trim();
    }

    isMethodActive(): boolean {
        return !!this.methodFilter.trim();
    }

    isFromDateActive(): boolean {
        return !!this.activeFromDate().trim();
    }

    isToDateActive(): boolean {
        return !!this.activeToDate().trim();
    }

    private restoreStateFromSessionStorage(): boolean {
        const raw = sessionStorage.getItem(PAYMENTS_LIST_STATE_KEY);
        if (!raw) {
            return false;
        }
        try {
            const parsed = JSON.parse(raw) as Partial<PaymentsListState>;
            const page = Number(parsed.page);
            const pageSize = Number(parsed.pageSize);
            if (!Number.isFinite(page) || page < 1 || !Number.isFinite(pageSize) || pageSize < 1) {
                sessionStorage.removeItem(PAYMENTS_LIST_STATE_KEY);
                return false;
            }
            this.searchInput = typeof parsed.search === 'string' ? parsed.search : '';
            this.methodFilter = typeof parsed.method === 'string' ? parsed.method : '';
            this.fromDateInput = typeof parsed.fromDate === 'string' ? parsed.fromDate : '';
            this.toDateInput = typeof parsed.toDate === 'string' ? parsed.toDate : '';
            this.activeSearch.set(this.searchInput.trim());
            this.activeFromDate.set(this.fromDateInput.trim());
            this.activeToDate.set(this.toDateInput.trim());
            this.pageSize.set(pageSize);
            this.currentPage.set(page);
            this.first.set((page - 1) * pageSize);
            return true;
        } catch {
            sessionStorage.removeItem(PAYMENTS_LIST_STATE_KEY);
            return false;
        }
    }

    private persistStateToSessionStorage(page: number, pageSize: number): void {
        const state: PaymentsListState = {
            search: this.searchInput.trim(),
            method: this.methodFilter.trim(),
            fromDate: this.fromDateInput.trim(),
            toDate: this.toDateInput.trim(),
            page,
            pageSize
        };
        sessionStorage.setItem(PAYMENTS_LIST_STATE_KEY, JSON.stringify(state));
    }

    private clearStateFromSessionStorage(): void {
        sessionStorage.removeItem(PAYMENTS_LIST_STATE_KEY);
    }
}
