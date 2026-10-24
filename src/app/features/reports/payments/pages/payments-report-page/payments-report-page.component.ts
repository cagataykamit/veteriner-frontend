import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { PAYMENTS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { paymentMethodLabel } from '@/app/features/payments/utils/payment-method.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import type { PaymentsReportQuery } from '@/app/features/reports/payments/models/payments-report-query.model';
import type { PaymentsReportResultVm } from '@/app/features/reports/payments/models/payments-report.model';
import { PaymentsReportService } from '@/app/features/reports/payments/services/payments-report.service';
import { ReportFilterBarComponent } from '@/app/features/reports/shared/report-filter-bar.component';
import { ReportListState } from '@/app/features/reports/shared/report-list-state';
import { reportClinicLabel } from '@/app/features/reports/shared/report-my-clinic.utils';
import { ReportResultsComponent } from '@/app/features/reports/shared/report-results.component';
import { REPORTS_ROUTE } from '@/app/core/routing/panel-navigation';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { reportTableRowTrackKey } from '@/app/shared/utils/report-row-track.utils';
import { MoneyPipe } from '@/app/shared/pipes/money.pipe';

@Component({
    selector: 'app-payments-report-page',
    standalone: true,
    imports: [CommonModule, RouterLink, TableModule, AppPageHeaderComponent, ReportFilterBarComponent, ReportResultsComponent, MoneyPipe],
    template: `
        <app-page-header [categoryLink]="reportsRoute" categoryLinkLabel="Raporlar" [title]="copy.paymentsReportTitle" [description]="copy.paymentsReportDescription" />

        <app-report-filter-bar
            [state]="state"
            idPrefix="payRep"
            dateLimit="past"
            [periodHint]="copy.paymentsReportDefaultPeriodHint"
            [searchPlaceholder]="copy.paymentsReportSearchPlaceholder"
            [extraFilter]="{ label: copy.paymentsReportColMethod, options: methodOptions }"
        />

        <app-report-results [state]="state" [emptyMessage]="copy.paymentsReportEmptyMessage" [emptyHint]="copy.paymentsReportEmptyHint">
            <ng-template #summary>
                <div class="col-span-12 sm:col-span-6">
                    <span class="block text-muted-color text-sm mb-1">{{ copy.paymentsReportTotalAmount }}</span>
                    <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ formatMoneyLine(state.report()!.totalAmount) }}</div>
                </div>
            </ng-template>
            <ng-template #rows>
                <div class="hidden lg:block overflow-x-auto">
                    <p-table
                        [value]="displayedRows()"
                        [paginator]="true"
                        [rows]="state.pageSize()"
                        [rowsPerPageOptions]="state.rowsPerPageOptions"
                        [paginatorDropdownAppendTo]="'body'"
                        [totalRecords]="totalCount()"
                        [lazy]="true"
                        [first]="state.first()"
                        (onLazyLoad)="state.onTableLazyLoad($event)"
                        [tableStyle]="{ 'min-width': '72rem' }"
                        [showCurrentPageReport]="true"
                        currentPageReportTemplate="{first} - {last} / {totalRecords}"
                    >
                        <ng-template #header>
                            <tr>
                                <th>{{ copy.reportsColPrimaryLocalTime }}</th>
                                <th>{{ copy.reportsColClinic }}</th>
                                <th>{{ copy.labelClient }}</th>
                                <th>{{ copy.labelPet }}</th>
                                <th class="text-right">Tutar</th>
                                <th>Para birimi</th>
                                <th>{{ copy.paymentsReportColMethod }}</th>
                                <th>{{ copy.reportsColNotes }}</th>
                                <th style="width: 6rem"></th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr>
                                <td>{{ formatPaidAt(row.paidAtUtc) }}</td>
                                <td>{{ displayClinicLabel(row.clinicLabel) }}</td>
                                <td>
                                    @if (row.clientId) {
                                        <a [routerLink]="['/panel/clients', row.clientId]" class="text-primary font-medium no-underline">{{ row.clientName }}</a>
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
                                <td class="text-right font-medium">{{ row.amount | money: row.currency || 'TRY' }}</td>
                                <td>{{ row.currency }}</td>
                                <td>{{ methodLabel(row.method) }}</td>
                                <td class="max-w-[14rem] truncate" [title]="row.notes">{{ row.notes }}</td>
                                <td>
                                    <a [routerLink]="['/panel/payments', row.id]" class="text-primary font-medium no-underline text-sm">{{ copy.buttonDetail }}</a>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>

                <div class="lg:hidden space-y-3">
                    @for (row of displayedRows(); track reportTableRowTrackKey(row, $index)) {
                        <div class="rounded-border border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4 shadow-sm">
                            <div class="text-sm text-muted-color mb-2">{{ formatPaidAt(row.paidAtUtc) }}</div>
                            <div class="text-sm mb-1">
                                <span class="text-muted-color font-medium">{{ copy.reportsColClinic }}: </span>{{ displayClinicLabel(row.clinicLabel) }}
                            </div>
                            <div class="text-sm mb-1">
                                <span class="text-muted-color font-medium">{{ copy.labelClient }}: </span>
                                @if (row.clientId) {
                                    <a [routerLink]="['/panel/clients', row.clientId]" class="text-primary font-medium no-underline break-words">{{ row.clientName }}</a>
                                } @else {
                                    <span class="break-words">{{ row.clientName }}</span>
                                }
                            </div>
                            <div class="text-sm mb-2">
                                <span class="text-muted-color font-medium">{{ copy.labelPet }}: </span>
                                @if (row.petId) {
                                    <a [routerLink]="['/panel/pets', row.petId]" class="text-primary font-medium no-underline break-words">{{ row.petName }}</a>
                                } @else {
                                    <span class="break-words">{{ row.petName }}</span>
                                }
                            </div>
                            <div class="font-medium mb-1">{{ row.amount | money: row.currency || 'TRY' }} {{ row.currency }}</div>
                            <div class="text-sm text-muted-color mb-2">{{ copy.paymentsReportColMethod }}: {{ methodLabel(row.method) }}</div>
                            @if (row.notes && row.notes !== '—') {
                                <div class="text-sm text-muted-color break-words mb-2">{{ row.notes }}</div>
                            }
                            <div class="flex justify-end pt-2 border-t border-surface-200 dark:border-surface-700">
                                <a [routerLink]="['/panel/payments', row.id]" class="text-primary font-medium no-underline text-sm">{{ copy.buttonDetail }} →</a>
                            </div>
                        </div>
                    }
                </div>
            </ng-template>
        </app-report-results>
    `
})
export class PaymentsReportPageComponent implements OnInit {
    readonly reportsRoute = REPORTS_ROUTE;
    readonly copy = PANEL_COPY;
    readonly reportTableRowTrackKey = reportTableRowTrackKey;
    readonly displayClinicLabel = reportClinicLabel;

    readonly state = new ReportListState<PaymentsReportQuery, PaymentsReportResultVm>({
        source: inject(PaymentsReportService),
        stateKey: 'panel:reports:payments:listState',
        readClaim: PAYMENTS_READ_CLAIM,
        exportFilePrefix: 'odeme-raporu',
        extraFilterKey: 'method'
    });

    readonly methodOptions = [
        { label: PANEL_COPY.filterPlaceholderAll, value: '' },
        { label: 'Nakit', value: 'cash' },
        { label: 'Kart', value: 'card' },
        { label: 'Havale / EFT', value: 'transfer' }
    ];

    readonly displayedRows = computed(() => [...(this.state.report()?.items ?? [])]);
    readonly totalCount = computed(() => this.state.report()?.totalCount ?? 0);

    readonly formatPaidAt = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly methodLabel = paymentMethodLabel;
    readonly formatMoneyLine = (n: number) => formatMoney(n, 'TRY');

    ngOnInit(): void {
        this.state.init();
    }
}
