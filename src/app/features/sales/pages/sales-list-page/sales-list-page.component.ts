import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import type { TableLazyLoadEvent } from 'primeng/table';
import { TableModule } from 'primeng/table';
import { AuthService } from '@/app/core/auth/auth.service';
import { SALES_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { SaleListItemVm } from '@/app/features/sales/models/sale-vm.model';
import { SalesService } from '@/app/features/sales/services/sales.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { formatUtcIsoAsLocalDateTimeDisplay, istanbulDateRangeToUtcIso } from '@/app/shared/utils/date.utils';

/** Satış listesi (`Sales.Read`): tarih aralığı, iptal edilenleri dahil etme; satır detaya gider. */
@Component({
    selector: 'app-sales-list-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormsModule,
        RouterLink,
        ButtonModule,
        CheckboxModule,
        TableModule,
        DateInputComponent,
        FilterFieldComponent,
        AppListHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppEmptyStateComponent,
        AppStatusTagComponent
    ],
    template: `
        <div class="card">
            <app-list-header class="mb-4" title="Satışlar" [count]="totalItems()">
                @if (canCreate && !ro.mutationBlocked()) {
                    <a actions routerLink="/panel/sales/new" pButton type="button" label="Hızlı satış" icon="pi pi-shopping-cart"></a>
                } @else if (canCreate) {
                    <button actions pButton type="button" label="Hızlı satış (salt okunur)" icon="pi pi-lock" [disabled]="true" class="p-button-secondary"></button>
                }
            </app-list-header>
            <div class="flex flex-wrap items-end gap-3 mb-4">
                <app-filter-field label="Başlangıç" labelFor="saleFrom" [active]="!!fromDate" width="date">
                    <app-date-input inputId="saleFrom" type="date" min="1900-01-01" [(ngModel)]="fromDate" (ngModelChange)="applyFilters()" />
                </app-filter-field>
                <app-filter-field label="Bitiş" labelFor="saleTo" [active]="!!toDate" width="date">
                    <app-date-input inputId="saleTo" type="date" min="1900-01-01" [(ngModel)]="toDate" (ngModelChange)="applyFilters()" />
                </app-filter-field>
                <label class="flex items-center gap-2 pb-2 cursor-pointer">
                    <p-checkbox inputId="saleVoided" [binary]="true" [(ngModel)]="includeVoided" (ngModelChange)="applyFilters()" />
                    İptal edilenleri göster
                </label>
                <p-button [label]="copy.buttonClear" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
            </div>

            @if (loading() && rows().length === 0) {
                <app-loading-state message="Satış listesi yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="load()" />
            } @else if (rows().length === 0) {
                <app-empty-state message="Satış bulunamadı." hint="Filtreleri değiştirin ya da yeni bir satış yapın." />
            } @else {
                <div class="overflow-x-auto">
                    <p-table
                        [value]="rows()"
                        [lazy]="true"
                        [paginator]="true"
                        [rows]="pageSize()"
                        [first]="first()"
                        [totalRecords]="totalItems()"
                        [loading]="loading()"
                        [rowsPerPageOptions]="[10, 20, 50]"
                        (onLazyLoad)="onLazyLoad($event)"
                        [tableStyle]="{ 'min-width': '52rem' }"
                        [showCurrentPageReport]="true"
                        currentPageReportTemplate="{first} - {last} / {totalRecords}"
                    >
                        <ng-template #header>
                            <tr>
                                <th>Tarih</th>
                                <th>Müşteri</th>
                                <th>Ürünler</th>
                                <th class="text-right">Toplam</th>
                                <th class="text-right">Ödenen</th>
                                <th>Durum</th>
                                <th style="width: 6rem"></th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr [class.opacity-60]="row.isVoided">
                                <td class="whitespace-nowrap">{{ soldAt(row) }}</td>
                                <td>{{ row.clientName }}</td>
                                <td>{{ row.productsSummary }}</td>
                                <td class="text-right font-medium whitespace-nowrap">{{ row.totalText }}</td>
                                <td class="text-right whitespace-nowrap">
                                    {{ row.paidText }}
                                    @if (row.hasOutstanding) {
                                        <div class="text-xs text-muted-color">Kalan {{ row.outstandingText }}</div>
                                    }
                                </td>
                                <td><app-status-tag [label]="row.statusLabel" [severity]="row.statusSeverity" /></td>
                                <td><a [routerLink]="['/panel/sales', row.id]" class="text-primary font-medium no-underline">Detay</a></td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </div>
    `
})
export class SalesListPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    readonly ro = inject(TenantReadOnlyContextService);
    private readonly salesService = inject(SalesService);

    readonly canCreate = inject(AuthService).hasOperationClaim(SALES_CREATE_CLAIM);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly rows = signal<SaleListItemVm[]>([]);
    readonly totalItems = signal(0);
    readonly pageSize = signal(20);
    readonly first = signal(0);

    fromDate = '';
    toDate = '';
    includeVoided = false;

    private page = 1;

    ngOnInit(): void {
        this.load();
    }

    applyFilters(): void {
        this.page = 1;
        this.first.set(0);
        this.load();
    }

    resetFilters(): void {
        this.fromDate = '';
        this.toDate = '';
        this.includeVoided = false;
        this.applyFilters();
    }

    onLazyLoad(event: TableLazyLoadEvent): void {
        const rows = event.rows ?? this.pageSize();
        const page = rows !== this.pageSize() ? 1 : Math.floor((event.first ?? 0) / rows) + 1;

        // Tablo yeniden oluşunca ilk tetiklemede konum değişmemiştir; boş yere yeniden yüklenmez.
        if (page === this.page && rows === this.pageSize()) {
            return;
        }

        this.page = page;
        this.pageSize.set(rows);
        this.first.set((this.page - 1) * rows);
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);
        const range = istanbulDateRangeToUtcIso(this.fromDate || undefined, this.toDate || undefined);

        this.salesService
            .getSales({ page: this.page, pageSize: this.pageSize(), includeVoided: this.includeVoided, fromUtc: range.fromUtc, toUtc: range.toUtc })
            .subscribe({
                next: (r) => {
                    this.rows.set(r.items);
                    this.totalItems.set(r.totalItems);
                    this.loading.set(false);
                },
                error: (e: Error) => {
                    this.error.set(e.message || 'Satış listesi yüklenemedi.');
                    this.loading.set(false);
                }
            });
    }

    soldAt(row: SaleListItemVm): string {
        return formatUtcIsoAsLocalDateTimeDisplay(row.soldAtUtc);
    }
}
