import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { EXAMINATIONS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { ExaminationsReportQuery } from '@/app/features/reports/examinations/models/examinations-report-query.model';
import type { ExaminationsReportResultVm } from '@/app/features/reports/examinations/models/examinations-report.model';
import { ExaminationsReportService } from '@/app/features/reports/examinations/services/examinations-report.service';
import { ReportFilterBarComponent } from '@/app/features/reports/shared/report-filter-bar.component';
import { ReportListState } from '@/app/features/reports/shared/report-list-state';
import { reportClinicLabel } from '@/app/features/reports/shared/report-my-clinic.utils';
import { ReportResultsComponent } from '@/app/features/reports/shared/report-results.component';
import { REPORTS_ROUTE } from '@/app/core/routing/panel-navigation';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { reportTableRowTrackKey } from '@/app/shared/utils/report-row-track.utils';

@Component({
    selector: 'app-examinations-report-page',
    standalone: true,
    imports: [CommonModule, RouterLink, TableModule, AppPageHeaderComponent, ReportFilterBarComponent, ReportResultsComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <app-page-header [categoryLink]="reportsRoute" categoryLinkLabel="Raporlar" [title]="copy.examinationsReportTitle" [description]="copy.examinationsReportDescription" />

        <app-report-filter-bar [state]="state" idPrefix="examRep" dateLimit="past" [periodHint]="copy.examinationsReportDefaultPeriodHint" [searchPlaceholder]="copy.examinationsReportSearchPlaceholder" />

        <app-report-results [state]="state" [emptyMessage]="copy.examinationsReportEmptyMessage" [emptyHint]="copy.examinationsReportEmptyHint">
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
                        [tableStyle]="{ 'min-width': '58rem' }"
                        [showCurrentPageReport]="true"
                        currentPageReportTemplate="{first} - {last} / {totalRecords}"
                    >
                        <ng-template #header>
                            <tr>
                                <th>{{ copy.reportsColPrimaryLocalTime }}</th>
                                <th>{{ copy.reportsColClinic }}</th>
                                <th>{{ copy.labelClient }}</th>
                                <th>{{ copy.labelPet }}</th>
                                <th>{{ copy.examinationsReportColLinkedAppointment }}</th>
                                <th style="width: 6rem"></th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr>
                                <td>{{ formatExaminedAt(row.examinedAtUtc) }}</td>
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
                                <td>
                                    @if (row.appointmentLinked && row.appointmentId) {
                                        <a [routerLink]="['/panel/appointments', row.appointmentId]" class="text-primary font-medium no-underline">{{ copy.examinationsReportLinkedAppointment }}</a>
                                    } @else {
                                        <span class="text-muted-color">{{ copy.examinationsReportNoAppointment }}</span>
                                    }
                                </td>
                                <td>
                                    <a [routerLink]="['/panel/examinations', row.id]" class="text-primary font-medium no-underline text-sm">{{ copy.buttonDetail }}</a>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>

                <div class="lg:hidden space-y-3">
                    @for (row of displayedRows(); track reportTableRowTrackKey(row, $index)) {
                        <div class="rounded-border border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4 shadow-sm">
                            <div class="text-sm text-muted-color mb-2">{{ formatExaminedAt(row.examinedAtUtc) }}</div>
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
                            <div class="text-sm mb-1">
                                <span class="text-muted-color font-medium">{{ copy.labelPet }}: </span>
                                @if (row.petId) {
                                    <a [routerLink]="['/panel/pets', row.petId]" class="text-primary font-medium no-underline break-words">{{ row.petName }}</a>
                                } @else {
                                    <span class="break-words">{{ row.petName }}</span>
                                }
                            </div>
                            <div class="text-sm mb-1">
                                <span class="text-muted-color font-medium">{{ copy.examinationsReportColLinkedAppointment }}: </span>
                                @if (row.appointmentLinked && row.appointmentId) {
                                    <a [routerLink]="['/panel/appointments', row.appointmentId]" class="text-primary font-medium no-underline">{{ copy.examinationsReportLinkedAppointment }}</a>
                                } @else {
                                    <span class="text-muted-color">{{ copy.examinationsReportNoAppointment }}</span>
                                }
                            </div>
                            <div class="flex justify-end pt-2 border-t border-surface-200 dark:border-surface-700">
                                <a [routerLink]="['/panel/examinations', row.id]" class="text-primary font-medium no-underline text-sm">{{ copy.buttonDetail }} →</a>
                            </div>
                        </div>
                    }
                </div>
            </ng-template>
        </app-report-results>
    `
})
export class ExaminationsReportPageComponent implements OnInit {
    readonly reportsRoute = REPORTS_ROUTE;
    readonly copy = PANEL_COPY;
    readonly reportTableRowTrackKey = reportTableRowTrackKey;
    readonly displayClinicLabel = reportClinicLabel;

    readonly state = new ReportListState<ExaminationsReportQuery, ExaminationsReportResultVm>({
        source: inject(ExaminationsReportService),
        stateKey: 'panel:reports:examinations:listState',
        readClaim: EXAMINATIONS_READ_CLAIM,
        exportFilePrefix: 'muayene-raporu'
    });

    readonly displayedRows = computed(() => [...(this.state.report()?.items ?? [])]);
    readonly totalCount = computed(() => this.state.report()?.totalCount ?? 0);

    readonly formatExaminedAt = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);

    ngOnInit(): void {
        this.state.init();
    }
}
