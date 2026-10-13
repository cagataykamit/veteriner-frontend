import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { APPOINTMENTS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { appointmentStatusLabel, appointmentStatusSeverity } from '@/app/features/appointments/utils/appointment-status.utils';
import type { AppointmentsReportQuery } from '@/app/features/reports/appointments/models/appointments-report-query.model';
import type { AppointmentsReportResultVm } from '@/app/features/reports/appointments/models/appointments-report.model';
import { AppointmentsReportService } from '@/app/features/reports/appointments/services/appointments-report.service';
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
    selector: 'app-appointments-report-page',
    standalone: true,
    imports: [CommonModule, RouterLink, TableModule, AppPageHeaderComponent, ReportFilterBarComponent, ReportResultsComponent, AppStatusTagComponent],
    template: `
        <a [routerLink]="reportsRoute" class="text-primary font-medium no-underline inline-block mb-4">← Raporlar</a>
        <app-page-header
            [title]="copy.appointmentsReportTitle"
            [subtitle]="copy.reportsNavGroup"
            [description]="copy.appointmentsReportDescription"
        />

        <app-report-filter-bar
            [state]="state"
            idPrefix="apptRep"
            dateLimit="planned"
            [periodHint]="copy.appointmentsReportDefaultPeriodHint"
            [searchPlaceholder]="copy.appointmentsReportSearchPlaceholder"
            [extraFilter]="{ label: copy.appointmentsReportColStatus, options: statusOptions }"
        />

        <app-report-results [state]="state" [emptyMessage]="copy.appointmentsReportEmptyMessage" [emptyHint]="copy.appointmentsReportEmptyHint">
            <ng-template #summary>
                @if (state.report()!.noShowCount !== null) {
                    <div class="col-span-12 sm:col-span-6">
                        <span class="block text-muted-color text-sm mb-1">Gelmedi</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ state.report()!.noShowCount }}</div>
                    </div>
                }
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
                            [tableStyle]="{ 'min-width': '76rem' }"
                            [showCurrentPageReport]="true"
                            currentPageReportTemplate="{first} - {last} / {totalRecords}"
                        >
                            <ng-template #header>
                                <tr>
                                    <th>{{ copy.reportsColPrimaryLocalTime }}</th>
                                    <th>{{ copy.reportsColClinic }}</th>
                                    <th>{{ copy.labelClient }}</th>
                                    <th>{{ copy.labelPet }}</th>
                                    <th>{{ copy.appointmentsReportColStatus }}</th>
                                    <th>{{ copy.reportsColNotes }}</th>
                                    <th style="width: 6rem"></th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-row>
                                <tr>
                                    <td>{{ formatScheduledAt(row.scheduledAtUtc) }}</td>
                                    <td>{{ displayClinicLabel(row.clinicLabel) }}</td>
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
                                    <td>
                                        <app-status-tag [label]="statusLabel(row.status)" [severity]="statusSeverity(row.status)" />
                                    </td>
                                    <td class="max-w-[14rem] truncate" [title]="row.notes">{{ row.notes }}</td>
                                    <td>
                                        <a [routerLink]="['/panel/appointments', row.id]" class="text-primary font-medium no-underline text-sm">{{ copy.buttonDetail }}</a>
                                    </td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>

                    <div class="lg:hidden space-y-3">
                        @for (row of displayedRows(); track reportTableRowTrackKey(row, $index)) {
                            <div
                                class="rounded-border border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4 shadow-sm"
                            >
                                <div class="flex flex-wrap items-start justify-between gap-2 gap-y-1 mb-2">
                                    <div class="text-sm text-muted-color">{{ formatScheduledAt(row.scheduledAtUtc) }}</div>
                                    <app-status-tag [label]="statusLabel(row.status)" [severity]="statusSeverity(row.status)" />
                                </div>
                                <div class="text-sm mb-1">
                                    <span class="text-muted-color font-medium">{{ copy.reportsColClinic }}: </span>{{ displayClinicLabel(row.clinicLabel) }}
                                </div>
                                <div class="text-sm mb-1">
                                    <span class="text-muted-color font-medium">{{ copy.labelClient }}: </span>
                                    @if (row.clientId) {
                                        <a [routerLink]="['/panel/clients', row.clientId]" class="text-primary font-medium no-underline break-words">{{
                                            row.clientName
                                        }}</a>
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
                                @if (row.notes && row.notes !== '—') {
                                    <div class="text-sm text-muted-color break-words mb-2">
                                        <span class="font-medium">{{ copy.reportsColNotes }}: </span>{{ row.notes }}
                                    </div>
                                }
                                <div class="flex justify-end pt-2 border-t border-surface-200 dark:border-surface-700">
                                    <a [routerLink]="['/panel/appointments', row.id]" class="text-primary font-medium no-underline text-sm">{{ copy.buttonDetail }} →</a>
                                </div>
                            </div>
                        }
                    </div>
            </ng-template>
        </app-report-results>
    `
})
export class AppointmentsReportPageComponent implements OnInit {
    readonly reportsRoute = REPORTS_ROUTE;
    readonly copy = PANEL_COPY;
    readonly reportTableRowTrackKey = reportTableRowTrackKey;
    readonly displayClinicLabel = reportClinicLabel;

    readonly state = new ReportListState<AppointmentsReportQuery, AppointmentsReportResultVm>({
        source: inject(AppointmentsReportService),
        stateKey: 'panel:reports:appointments:listState',
        readClaim: APPOINTMENTS_READ_CLAIM,
        exportFilePrefix: 'randevu-raporu',
        extraFilterKey: 'status'
    });

    readonly statusOptions = [
        { label: PANEL_COPY.filterPlaceholderAll, value: '' },
        { label: 'Planlandı', value: '0' },
        { label: 'Tamamlandı', value: '1' },
        { label: 'İptal', value: '2' },
        { label: 'Gelmedi', value: '3' }
    ];

    readonly displayedRows = computed(() => [...(this.state.report()?.items ?? [])]);
    readonly totalCount = computed(() => this.state.report()?.totalCount ?? 0);

    readonly formatScheduledAt = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly statusLabel = appointmentStatusLabel;
    readonly statusSeverity = appointmentStatusSeverity;

    ngOnInit(): void {
        this.state.init();
    }
}
