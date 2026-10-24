import { debouncedAction } from '@/app/shared/ui/search-input/debounced-action';
import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AppContextFilterChipComponent } from '@/app/shared/ui/context-filter-chip/app-context-filter-chip.component';
import { CLEAR_CONTEXT_FILTER_QUERY, readContextFilterParam } from '@/app/shared/utils/context-filter.utils';
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
import { ReasonConfirmDialogComponent } from '@/app/shared/ui/reason-confirm-dialog/reason-confirm-dialog.component';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { PAYMENTS_CORRECT_CLAIM, PAYMENTS_CREATE_CLAIM, PAYMENTS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';
import { MoneyPipe } from '@/app/shared/pipes/money.pipe';

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
        AppListHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppContextFilterChipComponent,
        AppErrorStateComponent,
        DateInputComponent,
        FilterFieldComponent,
        SearchInputComponent,
        ReasonConfirmDialogComponent,
        AppRowActionButtonComponent,
        MoneyPipe
    ],
    template: `
        @if (contextPetId() || contextClientId()) {
            <app-context-filter-chip [label]="contextFilterLabel()" (clear)="clearContextFilter()" />
        }

        <div class="card">
            <div class="flex flex-col gap-4">
                <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                    <app-list-header class="mb-3" title="Ödemeler" [count]="totalItems()">
                        <app-filter-field label="Arama" labelFor="paySearch" [active]="isSearchActive()" width="grow">
                            <app-search-input inputId="paySearch" placeholder="Not, para birimi; müşteri, hasta, tür veya ırk, e-posta, telefon…" [(value)]="searchInput" (searchRequested)="applySearch()" />
                        </app-filter-field>
                        <p-button actions [label]="copy.buttonClear" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
                        @if (canCreatePayment && !ro.mutationBlocked()) {
                            <a actions routerLink="/panel/payments/new" pButton type="button" label="Yeni Ödeme" icon="pi pi-plus" class="p-button-primary"></a>
                        } @else if (canCreatePayment && ro.mutationBlocked()) {
                            <button actions pButton type="button" label="Yeni Ödeme (salt okunur)" icon="pi pi-lock" [disabled]="true" class="p-button-secondary"></button>
                        }
                    </app-list-header>
                    <div class="flex flex-wrap items-end gap-3">
                        <app-filter-field label="Yöntem" labelId="lblPayMethod" [active]="isMethodActive()" width="select">
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
                                (ngModelChange)="scheduleApply()"
                            />
                        </app-filter-field>
                        <app-filter-field label="Ödeme tarihi (başlangıç)" labelFor="payFrom" [active]="isFromDateActive()" width="date">
                            <app-date-input inputId="payFrom" type="date" min="1900-01-01" [(ngModel)]="fromDateInput" limit="past" (ngModelChange)="scheduleApply()" />
                        </app-filter-field>
                        <app-filter-field label="Ödeme tarihi (bitiş)" labelFor="payTo" [active]="isToDateActive()" width="date">
                            <app-date-input inputId="payTo" type="date" min="1900-01-01" [(ngModel)]="toDateInput" limit="past" (ngModelChange)="scheduleApply()" />
                        </app-filter-field>
                    </div>
                </div>
                @if (loading()) {
                    <app-loading-state message="Ödeme listesi yükleniyor…" />
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
                                (onLazyLoad)="onTableLazyLoad($event)"
                                [tableStyle]="{ 'min-width': '56rem' }"
                                [showCurrentPageReport]="true"
                                currentPageReportTemplate="{first} - {last} / {totalRecords}"
                            >
                                <ng-template #header>
                                    <tr class="whitespace-nowrap">
                                        <th>Müşteri</th>
                                        <th>Hasta</th>
                                        <th class="text-right">Tutar</th>
                                        <th>Para birimi</th>
                                        <th>Yöntem</th>
                                        <th>Ödeme tarihi</th>
                                        <th style="width: 10rem">İşlemler</th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-row>
                                    <tr>
                                        <td>
                                            @if (row.clientId) {
                                                <a [routerLink]="['/panel/clients', row.clientId]" class="block max-w-[9rem] truncate text-primary font-medium no-underline" [title]="row.clientName">{{ row.clientName }}</a>
                                            } @else {
                                                <div class="max-w-[9rem] truncate" [title]="row.clientName">{{ row.clientName }}</div>
                                            }
                                        </td>
                                        <td>
                                            @if (row.petId) {
                                                <a [routerLink]="['/panel/pets', row.petId]" class="block max-w-[7rem] truncate text-primary font-medium no-underline" [title]="row.petName">{{ row.petName }}</a>
                                            } @else {
                                                <div class="max-w-[7rem] truncate" [title]="row.petName">{{ row.petName }}</div>
                                            }
                                        </td>
                                        <td class="text-right whitespace-nowrap font-medium">{{ row.amount | money: row.currency || 'TRY' }}</td>
                                        <td>{{ row.currency }}</td>
                                        <td class="whitespace-nowrap">{{ methodLabel(row.method) }}</td>
                                        <td class="whitespace-nowrap">{{ formatPaidAtUtc(row.paidAtUtc) }}</td>
                                        <td class="whitespace-nowrap">
                                            <div class="flex items-center gap-1">
                                                <app-row-action-button action="detail" [link]="['/panel/payments', row.id]" />
                                                @if (canUpdatePayment && !ro.mutationBlocked()) {
                                                    <app-row-action-button action="edit" [link]="['/panel/payments', row.id, 'edit']" />
                                                } @else if (canUpdatePayment && ro.mutationBlocked()) {
                                                    <app-row-action-button action="edit" label="Düzenle (salt okunur)" [disabled]="true" />
                                                }
                                                @if (canVoid && !ro.mutationBlocked()) {
                                                    <app-row-action-button action="void" (pressed)="openVoid(row)" />
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
                                        {{ formatPaidAtUtc(row.paidAtUtc) }}
                                    </div>
                                    <div class="space-y-2 mb-3 min-w-0">
                                        <div class="text-sm">
                                            <span class="text-muted-color font-medium">Müşteri: </span>
                                            @if (row.clientId) {
                                                <a [routerLink]="['/panel/clients', row.clientId]" class="text-primary font-medium no-underline break-words">{{ row.clientName }}</a>
                                            } @else {
                                                <span class="break-words">{{ row.clientName }}</span>
                                            }
                                        </div>
                                        <div class="text-sm">
                                            <span class="text-muted-color font-medium">Hasta: </span>
                                            @if (row.petId) {
                                                <a [routerLink]="['/panel/pets', row.petId]" class="text-primary font-medium no-underline break-words">{{ row.petName }}</a>
                                            } @else {
                                                <span class="break-words">{{ row.petName }}</span>
                                            }
                                        </div>
                                    </div>
                                    <div class="text-sm font-medium mb-2 min-w-0 break-words">
                                        {{ row.amount | money: row.currency || 'TRY' }}
                                        <span class="text-muted-color font-normal"> {{ row.currency }}</span>
                                    </div>
                                    <div class="text-sm text-muted-color mb-3 min-w-0"><span class="font-medium">Yöntem: </span>{{ methodLabel(row.method) }}</div>
                                    <div class="flex justify-end items-center gap-1 pt-1 border-t border-surface-200 dark:border-surface-700">
                                        <app-row-action-button action="detail" [link]="['/panel/payments', row.id]" />
                                        @if (canUpdatePayment && !ro.mutationBlocked()) {
                                            <app-row-action-button action="edit" [link]="['/panel/payments', row.id, 'edit']" />
                                        } @else if (canUpdatePayment && ro.mutationBlocked()) {
                                            <app-row-action-button action="edit" label="Düzenle (salt okunur)" [disabled]="true" />
                                        }
                                        @if (canVoid && !ro.mutationBlocked()) {
                                            <app-row-action-button action="void" (pressed)="openVoid(row)" />
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
                                (onPageChange)="onMobilePageChange($event)"
                            />
                        </div>
                    }
                }
            </div>
        </div>

        <app-reason-confirm-dialog
            [(visible)]="voidVisible"
            header="Ödemeyi iptal et"
            [summary]="voidSummary()"
            description="Ödeme hiç alınmamış sayılır: bağlı olduğu ücretlerin açık tutarı artar, listelerden ve bakiyeden düşer. Geri alınamaz; yanlışsa doğrusu yeni ödeme olarak girilir."
            confirmLabel="Ödemeyi iptal et"
            failureFallback="Ödeme iptal edilemedi."
            [execute]="voidPayment"
            (confirmed)="afterVoid()"
        />
    `
})
export class PaymentsListPageComponent implements OnInit {
    protected readonly scheduleApply = debouncedAction(() => this.applySearch());
    readonly copy = PANEL_COPY;
    readonly ro = inject(TenantReadOnlyContextService);
    private readonly auth = inject(AuthService);

    private readonly paymentsService = inject(PaymentsService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    readonly contextPetId = signal(readContextFilterParam(this.route, 'petId'));
    readonly contextClientId = signal(readContextFilterParam(this.route, 'clientId'));
    readonly contextFilterLabel = computed(() => (this.contextPetId() ? 'Seçili hastanın kayıtları gösteriliyor' : 'Seçili müşterinin kayıtları gösteriliyor'));

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
    readonly canUpdatePayment = this.auth.hasOperationClaim(PAYMENTS_UPDATE_CLAIM);
    readonly canVoid = this.auth.hasOperationClaim(PAYMENTS_CORRECT_CLAIM);

    /** İptal diyaloğunun açık olduğu satır. */
    readonly voidTarget = signal<PaymentListItemVm | null>(null);
    voidVisible = false;
    readonly voidSummary = computed(() => {
        const p = this.voidTarget();

        return p ? `${p.clientName} · ${formatMoney(p.amount, p.currency || 'TRY')} · ${paymentMethodLabel(p.method)}` : null;
    });
    readonly voidPayment = (reason: string) => this.paymentsService.voidPayment(this.voidTarget()!.id, reason);

    readonly displayedRows = computed(() => this.rawItems());

    readonly formatPaidAtUtc = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly methodLabel = paymentMethodLabel;
    readonly hasActiveFilters = computed(() => !!this.activeSearch().trim() || !!this.methodFilter.trim() || !!this.activeFromDate().trim() || !!this.activeToDate().trim());
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

    openVoid(row: PaymentListItemVm): void {
        this.voidTarget.set(row);
        this.voidVisible = true;
    }

    /** Sayfadaki son kayıt iptal edildiyse boş sayfa yerine bir önceki sayfaya döner. */
    afterVoid(): void {
        if (this.rawItems().length === 1 && this.currentPage() > 1) {
            this.currentPage.set(this.currentPage() - 1);
            this.first.set((this.currentPage() - 1) * this.pageSize());
        }

        this.reload();
    }

    clearContextFilter(): void {
        this.contextPetId.set('');
        this.contextClientId.set('');
        void this.router.navigate([], { queryParams: CLEAR_CONTEXT_FILTER_QUERY, queryParamsHandling: 'merge', replaceUrl: true });
        this.currentPage.set(1);
        this.first.set(0);
        this.reload();
    }

    reload(): void {
        this.loadFromServer(this.currentPage(), this.pageSize(), this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.methodFilter, true);
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

    private loadFromServer(page: number, pageSize: number, search: string, fromDate: string, toDate: string, method: string, force = false): void {
        const key = `${page}|${pageSize}|${search.trim()}|${fromDate.trim()}|${toDate.trim()}|${method.trim()}|${this.contextPetId()}|${this.contextClientId()}`;

        if (!force && key === this.lastLoadKey) {
            return;
        }

        this.lastLoadKey = key;
        this.loading.set(true);
        this.error.set(null);
        this.paymentsService
            .getPayments({
                petId: this.contextPetId() || undefined,
                clientId: this.contextClientId() || undefined,
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
