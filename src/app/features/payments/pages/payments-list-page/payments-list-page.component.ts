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
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';

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
            <a actions routerLink="/panel/payments/new" pButton type="button" label="Yeni Ödeme" icon="pi pi-plus" class="p-button-primary"></a>
        </app-page-header>

        <div class="card mb-6">
            <div class="grid grid-cols-12 gap-4 items-end">
                <div class="col-span-12 md:col-span-4">
                    <label for="paySearch" class="block text-sm font-medium text-muted-color mb-2">Arama</label>
                    <input
                        pInputText
                        id="paySearch"
                        class="w-full"
                        [(ngModel)]="searchInput"
                        placeholder="Not, para birimi; müşteri, hayvan, tür veya ırk, e-posta, telefon…"
                        (keyup.enter)="applySearch()"
                    />
                </div>
                <div class="col-span-12 md:col-span-2">
                    <label for="payMethod" class="block text-sm font-medium text-muted-color mb-2">Yöntem</label>
                    <p-select
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
                <div class="col-span-12 md:col-span-2">
                    <label for="payFrom" class="block text-sm font-medium text-muted-color mb-2">Ödeme tarihi (başlangıç)</label>
                    <input id="payFrom" type="date" class="w-full p-inputtext p-component" [(ngModel)]="fromDateInput" />
                </div>
                <div class="col-span-12 md:col-span-2">
                    <label for="payTo" class="block text-sm font-medium text-muted-color mb-2">Ödeme tarihi (bitiş)</label>
                    <input id="payTo" type="date" class="w-full p-inputtext p-component" [(ngModel)]="toDateInput" />
                </div>
                <div class="col-span-12 flex flex-wrap gap-2">
                    <p-button [label]="copy.buttonSearch" icon="pi pi-search" (onClick)="applySearch()" [disabled]="loading()" />
                    <p-button [label]="copy.buttonClear" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
                </div>
            </div>
        </div>

        @if (loading()) {
            <app-loading-state message="Ödeme listesi yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else {
            <div class="card">
                <div class="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h5 class="m-0">Ödemeler</h5>
                    @if (totalItems() > 0) {
                        <span class="text-sm text-muted-color whitespace-nowrap">{{ totalItems() }} kayıt</span>
                    }
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
                                    <td>{{ formatDateTime(row.paidAtUtc) }}</td>
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
                                    {{ formatDateTime(row.paidAtUtc) }}
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

                    <p-paginator
                        class="lg:hidden mt-4"
                        [rows]="pageSize()"
                        [totalRecords]="totalItems()"
                        [first]="first()"
                        [showCurrentPageReport]="true"
                        currentPageReportTemplate="{first} - {last} / {totalRecords}"
                        [rowsPerPageOptions]="[10, 25, 50]"
                        (onPageChange)="onMobilePageChange($event)"
                    />
                }
            </div>
        }
    `
})
export class PaymentsListPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly paymentsService = inject(PaymentsService);

    readonly loading = signal(false);
    readonly error = signal<string | null>(null);

    readonly rawItems = signal<PaymentListItemVm[]>([]);
    readonly totalItems = signal(0);
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

    readonly displayedRows = computed(() => this.rawItems());

    readonly formatDateTime = (v: string | null) => formatDateTimeDisplay(v);
    readonly money = (amount: number | null, currency: string) => formatMoney(amount, currency || 'TRY');
    readonly methodLabel = paymentMethodLabel;
    private suppressNextLazy = false;
    private lastLoadKey = '';

    ngOnInit(): void {
        this.suppressNextLazy = true;
        this.loadFromServer(1, this.pageSize(), this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.methodFilter);
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
        const rows = event.rows ?? 10;
        const first = event.first ?? 0;
        const page = Math.floor(first / rows) + 1;
        this.loadFromServer(page, rows, this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.methodFilter);
    }

    onMobilePageChange(state: PaginatorState): void {
        const rows = state.rows ?? this.pageSize();
        const first = state.first ?? 0;
        const page = Math.floor(first / rows) + 1;
        this.suppressNextLazy = true;
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
                    this.loading.set(false);
                },
                error: (e: Error) => {
                    this.error.set(e.message ?? 'Yükleme hatası');
                    this.loading.set(false);
                }
            });
    }
}
