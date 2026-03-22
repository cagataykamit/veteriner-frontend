import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import { filterPaymentList } from '@/app/features/payments/data/payment.mapper';
import type { PaymentListItemVm } from '@/app/features/payments/models/payment-vm.model';
import { PaymentsService } from '@/app/features/payments/services/payments.service';
import { paymentMethodLabel } from '@/app/features/payments/utils/payment-method.utils';
import { paymentStatusLabel, paymentStatusSeverity } from '@/app/features/payments/utils/payment-status.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatDateDisplay, formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
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
        ButtonModule,
        InputTextModule,
        SelectModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    template: `
        <app-page-header title="Ödemeler" subtitle="Finans" description="Ödeme kayıtları ve takip.">
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
                        placeholder="Müşteri, hayvan, tutar…"
                        (keyup.enter)="applySearch()"
                    />
                </div>
                <div class="col-span-12 md:col-span-2">
                    <label for="payStatus" class="block text-sm font-medium text-muted-color mb-2">Durum</label>
                    <p-select
                        inputId="payStatus"
                        [options]="statusOptions"
                        [(ngModel)]="statusFilter"
                        optionLabel="label"
                        optionValue="value"
                        [placeholder]="copy.filterPlaceholderAll"
                        styleClass="w-full"
                        [showClear]="true"
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
                    <label for="payFrom" class="block text-sm font-medium text-muted-color mb-2">Başlangıç</label>
                    <input id="payFrom" type="date" class="w-full p-inputtext p-component" [(ngModel)]="fromDateInput" />
                </div>
                <div class="col-span-12 md:col-span-2">
                    <label for="payTo" class="block text-sm font-medium text-muted-color mb-2">Bitiş</label>
                    <input id="payTo" type="date" class="w-full p-inputtext p-component" [(ngModel)]="toDateInput" />
                </div>
                <div class="col-span-12 flex flex-wrap gap-2">
                    <p-button [label]="copy.buttonSearch" icon="pi pi-search" (onClick)="applySearch()" [disabled]="loading()" />
                    <p-button [label]="copy.buttonClear" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
                </div>
            </div>
            <p class="text-muted-color text-sm mt-3 mb-0">
                Durum / yöntem filtreleri, API yanıtında ilgili alanlar varsa bu sayfadaki kayıtlar üzerinde de uygulanır (normalize edilir). Tarih aralığı
                <span class="font-medium">fromDate / toDate</span> ile gönderilir (backend desteklemiyorsa yok sayılır).
            </p>
        </div>

        @if (loading()) {
            <app-loading-state message="Ödeme listesi yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else {
            <div class="card">
                <h5 class="mb-4">{{ copy.recordsHeading }}</h5>
                @if (displayedRows().length === 0) {
                    <app-empty-state [message]="copy.listEmptyMessage" [hint]="copy.listEmptyHint" />
                } @else {
                    <p-table
                        [value]="displayedRows()"
                        [paginator]="true"
                        [rows]="pageSize()"
                        [totalRecords]="totalItems()"
                        [lazy]="true"
                        [first]="first()"
                        (onLazyLoad)="onTableLazyLoad($event)"
                        [tableStyle]="{ 'min-width': '80rem' }"
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
                                <th>Durum</th>
                                <th>Vade</th>
                                <th>Ödeme tarihi</th>
                                <th>Oluşturulma</th>
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
                                <td>
                                    <app-status-tag [label]="statusLabel(row.status)" [severity]="statusSeverity(row.status)" />
                                </td>
                                <td>{{ formatDate(row.dueDateUtc) }}</td>
                                <td>{{ formatDateTime(row.paidAtUtc) }}</td>
                                <td>{{ formatDate(row.createdAtUtc) }}</td>
                                <td>
                                    <a [routerLink]="['/panel/payments', row.id]" class="text-primary font-medium no-underline">Detay</a>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                }
            </div>
        }
    `
})
export class PaymentsListPageComponent {
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
    statusFilter = '';
    methodFilter = '';

    readonly statusOptions = [
        { label: 'Tümü', value: '' },
        { label: 'Ödendi', value: 'paid' },
        { label: 'Tamamlandı', value: 'completed' },
        { label: 'Mahsup', value: 'settled' },
        { label: 'Bekliyor', value: 'pending' },
        { label: 'Planlandı', value: 'scheduled' },
        { label: 'Kısmi', value: 'partial' },
        { label: 'Vadesi geçmiş', value: 'overdue' },
        { label: 'Başarısız', value: 'failed' },
        { label: 'İptal', value: 'cancelled' },
        { label: 'İade', value: 'refunded' },
        { label: 'Taslak', value: 'draft' }
    ];

    readonly methodOptions = [
        { label: 'Tümü', value: '' },
        { label: 'Nakit', value: 'cash' },
        { label: 'Kart', value: 'card' },
        { label: 'Havale / EFT', value: 'transfer' },
        { label: 'Online', value: 'online' },
        { label: 'Diğer', value: 'other' }
    ];

    readonly displayedRows = computed(() =>
        filterPaymentList(this.rawItems(), this.statusFilter ? this.statusFilter : null, this.methodFilter ? this.methodFilter : null)
    );

    readonly formatDate = (v: string | null) => formatDateDisplay(v);
    readonly formatDateTime = (v: string | null) => formatDateTimeDisplay(v);
    readonly money = (amount: number | null, currency: string) => formatMoney(amount, currency || 'TRY');
    readonly statusLabel = paymentStatusLabel;
    readonly statusSeverity = paymentStatusSeverity;
    readonly methodLabel = paymentMethodLabel;

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
        this.loadFromServer(1, this.pageSize(), this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.statusFilter, this.methodFilter);
    }

    resetFilters(): void {
        this.searchInput = '';
        this.fromDateInput = '';
        this.toDateInput = '';
        this.activeSearch.set('');
        this.activeFromDate.set('');
        this.activeToDate.set('');
        this.statusFilter = '';
        this.methodFilter = '';
        this.first.set(0);
        this.loadFromServer(1, this.pageSize(), '', '', '', '', '');
    }

    reload(): void {
        this.loadFromServer(
            this.currentPage(),
            this.pageSize(),
            this.activeSearch(),
            this.activeFromDate(),
            this.activeToDate(),
            this.statusFilter,
            this.methodFilter
        );
    }

    onTableLazyLoad(event: TableLazyLoadEvent): void {
        const rows = event.rows ?? 10;
        const first = event.first ?? 0;
        const page = Math.floor(first / rows) + 1;
        this.loadFromServer(page, rows, this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.statusFilter, this.methodFilter);
    }

    private loadFromServer(
        page: number,
        pageSize: number,
        search: string,
        fromDate: string,
        toDate: string,
        status: string,
        method: string
    ): void {
        this.loading.set(true);
        this.error.set(null);
        this.paymentsService
            .getPayments({
                page,
                pageSize,
                search: search || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
                status: status || undefined,
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
