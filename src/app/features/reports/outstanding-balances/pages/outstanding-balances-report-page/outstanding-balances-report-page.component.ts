import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { CHARGES_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { REPORTS_ROUTE } from '@/app/core/routing/panel-navigation';
import type { OutstandingBalancesReportQuery } from '@/app/features/reports/outstanding-balances/models/outstanding-balances-report-query.model';
import type { OutstandingBalancesReportResultVm } from '@/app/features/reports/outstanding-balances/models/outstanding-balances-report.model';
import { OutstandingBalancesReportService } from '@/app/features/reports/outstanding-balances/services/outstanding-balances-report.service';
import { ReportFilterBarComponent } from '@/app/features/reports/shared/report-filter-bar.component';
import { ReportListState } from '@/app/features/reports/shared/report-list-state';
import { ReportResultsComponent } from '@/app/features/reports/shared/report-results.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatUtcIsoAsLocalDateDisplay } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { reportTableRowTrackKey } from '@/app/shared/utils/report-row-track.utils';

@Component({
    selector: 'app-outstanding-balances-report-page',
    standalone: true,
    imports: [CommonModule, RouterLink, TableModule, AppPageHeaderComponent, ReportFilterBarComponent, ReportResultsComponent],
    template: `
        <app-page-header [categoryLink]="reportsRoute" categoryLinkLabel="Raporlar" [title]="copy.outstandingBalancesReportTitle" [description]="copy.outstandingBalancesReportDescription" />

        <app-report-filter-bar
            [state]="state"
            idPrefix="debtRep"
            dateLimit="past"
            [periodHint]="copy.outstandingBalancesReportPeriodHint"
            [searchPlaceholder]="copy.outstandingBalancesReportSearchPlaceholder"
            [extraFilter]="{ label: copy.outstandingBalancesReportMinAmount }"
        />

        <app-report-results
            [state]="state"
            [totalLabel]="copy.outstandingBalancesReportTotalCount"
            [emptyMessage]="copy.outstandingBalancesReportEmptyMessage"
            [emptyHint]="copy.outstandingBalancesReportEmptyHint"
        >
            <ng-template #summary>
                <div class="col-span-12 sm:col-span-6">
                    <span class="block text-muted-color text-sm mb-1">{{ copy.outstandingBalancesReportTotalAmount }}</span>
                    <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ money(state.report()!.totalOutstandingAmount) }}</div>
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
                        [tableStyle]="{ 'min-width': '48rem' }"
                        [showCurrentPageReport]="true"
                        currentPageReportTemplate="{first} - {last} / {totalRecords}"
                    >
                        <ng-template #header>
                            <tr>
                                <th>{{ copy.labelClient }}</th>
                                <th>Telefon</th>
                                <th class="text-right">{{ copy.outstandingBalancesReportColOutstanding }}</th>
                                <th class="text-right">{{ copy.outstandingBalancesReportColOpenCharges }}</th>
                                <th>{{ copy.outstandingBalancesReportColOldest }}</th>
                                <th style="width: 6rem"></th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr>
                                <td>
                                    <a [routerLink]="['/panel/clients', row.clientId]" class="text-primary font-medium no-underline">{{ row.clientName }}</a>
                                </td>
                                <td>{{ row.phone ?? '—' }}</td>
                                <td class="text-right font-medium">{{ money(row.outstandingAmount) }}</td>
                                <td class="text-right">{{ row.openChargeCount }}</td>
                                <td>{{ date(row.oldestOpenChargeAtUtc) }}</td>
                                <td>
                                    <a [routerLink]="chargesRoute" [queryParams]="{ clientId: row.clientId }" class="text-primary font-medium no-underline text-sm">{{
                                        copy.outstandingBalancesReportCharges
                                    }}</a>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>

                <div class="lg:hidden space-y-3">
                    @for (row of displayedRows(); track reportTableRowTrackKey(row, $index)) {
                        <div class="rounded-border border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4 shadow-sm">
                            <a [routerLink]="['/panel/clients', row.clientId]" class="text-primary font-medium no-underline break-words">{{ row.clientName }}</a>
                            <div class="text-sm text-muted-color mb-2">{{ row.phone ?? '—' }}</div>
                            <div class="font-medium mb-1">{{ money(row.outstandingAmount) }}</div>
                            <div class="text-sm text-muted-color mb-2">
                                {{ copy.outstandingBalancesReportColOpenCharges }}: {{ row.openChargeCount }} · {{ copy.outstandingBalancesReportColOldest }}:
                                {{ date(row.oldestOpenChargeAtUtc) }}
                            </div>
                            <div class="flex justify-end pt-2 border-t border-surface-200 dark:border-surface-700">
                                <a [routerLink]="chargesRoute" [queryParams]="{ clientId: row.clientId }" class="text-primary font-medium no-underline text-sm"
                                    >{{ copy.outstandingBalancesReportCharges }} →</a
                                >
                            </div>
                        </div>
                    }
                </div>
            </ng-template>
        </app-report-results>
    `
})
export class OutstandingBalancesReportPageComponent implements OnInit {
    readonly reportsRoute = REPORTS_ROUTE;
    readonly chargesRoute = '/panel/charges';
    readonly copy = PANEL_COPY;
    readonly reportTableRowTrackKey = reportTableRowTrackKey;

    readonly state = new ReportListState<OutstandingBalancesReportQuery, OutstandingBalancesReportResultVm>({
        source: inject(OutstandingBalancesReportService),
        stateKey: 'panel:reports:outstanding-balances:listState',
        readClaim: CHARGES_READ_CLAIM,
        exportFilePrefix: 'borc-raporu',
        extraFilterKey: 'minAmount',
        snapshot: true
    });

    readonly displayedRows = computed(() => [...(this.state.report()?.items ?? [])]);
    readonly totalCount = computed(() => this.state.report()?.totalCount ?? 0);

    readonly money = (n: number) => formatMoney(n, 'TRY');
    readonly date = (v: string) => formatUtcIsoAsLocalDateDisplay(v);

    ngOnInit(): void {
        this.state.init();
    }
}
