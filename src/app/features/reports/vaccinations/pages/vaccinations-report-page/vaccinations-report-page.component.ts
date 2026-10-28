import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { VACCINATIONS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { vaccinationStatusLabel, vaccinationStatusSeverity } from '@/app/entities/vaccination/utils/vaccination-status.utils';
import type { VaccinationsReportQuery } from '@/app/features/reports/vaccinations/models/vaccinations-report-query.model';
import type { VaccinationsReportResultVm } from '@/app/features/reports/vaccinations/models/vaccinations-report.model';
import { VaccinationsReportService } from '@/app/features/reports/vaccinations/services/vaccinations-report.service';
import { ReportFilterBarComponent } from '@/app/features/reports/shared/report-filter-bar.component';
import { ReportListState } from '@/app/features/reports/shared/report-list-state';
import { reportClinicLabel } from '@/app/features/reports/shared/report-my-clinic.utils';
import { ReportResultsComponent } from '@/app/features/reports/shared/report-results.component';
import { REPORTS_ROUTE } from '@/app/core/routing/panel-navigation';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { reportTableRowTrackKey } from '@/app/shared/utils/report-row-track.utils';

@Component({
    selector: 'app-vaccinations-report-page',
    standalone: true,
    imports: [CommonModule, RouterLink, TableModule, AppPageHeaderComponent, ReportFilterBarComponent, ReportResultsComponent, AppStatusTagComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-page-header [categoryLink]="reportsRoute" categoryLinkLabel="Raporlar" [title]="copy.vaccinationsReportTitle" [description]="copy.vaccinationsReportDescription" />

        <app-report-filter-bar
            [state]="state"
            idPrefix="vacRep"
            dateLimit="planned"
            [periodHint]="copy.vaccinationsReportDefaultPeriodHint"
            [searchPlaceholder]="copy.vaccinationsReportSearchPlaceholder"
            [extraFilter]="{ label: copy.vaccinationsReportColStatus, options: statusOptions }"
            [activeBadges]="false"
        />

        <app-report-results [state]="state" [summaryLine]="true" [emptyMessage]="copy.vaccinationsReportEmptyMessage" [emptyHint]="copy.vaccinationsReportEmptyHint">
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
                        [tableStyle]="{ 'min-width': '68rem' }"
                        [showCurrentPageReport]="true"
                        currentPageReportTemplate="{first} - {last} / {totalRecords}"
                    >
                        <ng-template #header>
                            <tr>
                                <th>{{ copy.labelClient }}</th>
                                <th>{{ copy.labelPet }}</th>
                                <th>{{ copy.vaccinationsReportColVaccineName }}</th>
                                <th>{{ copy.vaccinationsReportColStatus }}</th>
                                <th>{{ copy.vaccinationsReportColAppliedAt }}</th>
                                <th>{{ copy.vaccinationsReportColNextDue }}</th>
                                <th style="width: 6rem"></th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr>
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
                                <td class="max-w-[12rem] truncate" [title]="row.vaccineName">{{ row.vaccineName }}</td>
                                <td>
                                    <app-status-tag [label]="statusLabel(row.status)" [severity]="statusSeverity(row.status)" />
                                </td>
                                <td>{{ formatUtcInstant(row.appliedAtUtc) }}</td>
                                <td>{{ formatUtcInstant(row.dueAtUtc) }}</td>
                                <td>
                                    <a [routerLink]="['/panel/vaccinations', row.id]" class="text-primary font-medium no-underline text-sm">{{ copy.buttonDetail }}</a>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>

                <div class="lg:hidden space-y-3">
                    @for (row of displayedRows(); track reportTableRowTrackKey(row, $index)) {
                        <div class="rounded-border border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4 shadow-sm">
                            <div class="text-sm mb-1">
                                <span class="text-muted-color font-medium">{{ copy.labelClient }}: </span>
                                @if (row.clientId) {
                                    <a [routerLink]="['/panel/clients', row.clientId]" class="text-primary font-medium no-underline break-words">{{ row.clientName }}</a>
                                } @else {
                                    <span class="break-words">{{ row.clientName }}</span>
                                }
                            </div>
                            <div class="text-sm mb-1">
                                <span class="text-muted-color font-medium">{{ copy.labelPet }}: </span>
                                @if (row.petId) {
                                    <a [routerLink]="['/panel/pets', row.petId]" class="text-primary font-medium no-underline break-words">{{ row.petName }}</a>
                                } @else {
                                    <span class="break-words">{{ row.petName }}</span>
                                }
                            </div>
                            <div class="text-sm mb-1 min-w-0 break-words">
                                <span class="text-muted-color font-medium">{{ copy.vaccinationsReportColVaccineName }}: </span>{{ row.vaccineName }}
                            </div>
                            <div class="mb-2">
                                <app-status-tag [label]="statusLabel(row.status)" [severity]="statusSeverity(row.status)" />
                            </div>
                            <div class="text-sm text-muted-color mb-1">
                                <span class="font-medium">{{ copy.vaccinationsReportColAppliedAt }}: </span>{{ formatUtcInstant(row.appliedAtUtc) }}
                            </div>
                            <div class="text-sm text-muted-color mb-1">
                                <span class="font-medium">{{ copy.vaccinationsReportColNextDue }}: </span>{{ formatUtcInstant(row.dueAtUtc) }}
                            </div>
                            <div class="flex justify-end pt-2 border-t border-surface-200 dark:border-surface-700">
                                <a [routerLink]="['/panel/vaccinations', row.id]" class="text-primary font-medium no-underline text-sm">{{ copy.buttonDetail }} →</a>
                            </div>
                        </div>
                    }
                </div>
            </ng-template>
        </app-report-results>
    `
})
export class VaccinationsReportPageComponent implements OnInit {
    readonly reportsRoute = REPORTS_ROUTE;
    readonly copy = PANEL_COPY;
    readonly reportTableRowTrackKey = reportTableRowTrackKey;
    readonly displayClinicLabel = reportClinicLabel;

    readonly state = new ReportListState<VaccinationsReportQuery, VaccinationsReportResultVm>({
        source: inject(VaccinationsReportService),
        stateKey: 'panel:reports:vaccinations:listState',
        readClaim: VACCINATIONS_READ_CLAIM,
        exportFilePrefix: 'asi-raporu',
        extraFilterKey: 'status'
    });

    readonly statusOptions = [
        { label: PANEL_COPY.filterPlaceholderAll, value: '' },
        { label: 'Planlandı', value: '0' },
        { label: 'Uygulandı', value: '1' },
        { label: 'İptal', value: '2' }
    ];

    readonly displayedRows = computed(() => [...(this.state.report()?.items ?? [])]);
    readonly totalCount = computed(() => this.state.report()?.totalCount ?? 0);

    readonly formatVaccinationDate = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly formatUtcInstant = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly statusLabel = vaccinationStatusLabel;
    readonly statusSeverity = vaccinationStatusSeverity;

    ngOnInit(): void {
        this.state.init();
    }
}
