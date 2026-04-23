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
import { AuthService } from '@/app/core/auth/auth.service';
import { mapMyClinicsToSelectOptions } from '@/app/features/reports/shared/map-my-clinics-to-select-options';
import type { VaccinationsReportQuery } from '@/app/features/reports/vaccinations/models/vaccinations-report-query.model';
import type { VaccinationsReportResultVm } from '@/app/features/reports/vaccinations/models/vaccinations-report.model';
import { VaccinationsReportService } from '@/app/features/reports/vaccinations/services/vaccinations-report.service';
import { vaccinationStatusLabel, vaccinationStatusSeverity } from '@/app/features/vaccinations/utils/vaccination-status.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatUtcIsoAsLocalDateTimeDisplay, localDateYyyyMmDd } from '@/app/shared/utils/date.utils';
import { fileNameFromContentDisposition, triggerBlobDownload } from '@/app/shared/utils/file-download.utils';
import { reportTableRowTrackKey } from '@/app/shared/utils/report-row-track.utils';

@Component({
    selector: 'app-vaccinations-report-page',
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
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    template: `
        <app-page-header [title]="copy.vaccinationsReportTitle" [subtitle]="copy.reportsNavGroup" [description]="copy.vaccinationsReportDescription" />

        @if (exportError()) {
            <div class="card mb-4 border-red-200 dark:border-red-800">
                <p class="text-red-500 m-0 text-sm" role="alert">{{ exportError() }}</p>
            </div>
        }

        <div class="card mb-4">
            <p class="text-sm text-muted-color m-0 mb-4">{{ copy.vaccinationsReportDefaultPeriodHint }}</p>
            <div class="grid grid-cols-12 gap-3 items-end">
                <div class="col-span-12 md:col-span-3">
                    <label for="vacRepFrom" class="block text-xs font-medium text-muted-color mb-1">{{ copy.reportsFilterDateFrom }}</label>
                    <input id="vacRepFrom" type="date" class="w-full p-inputtext p-component" [(ngModel)]="fromDateInput" />
                </div>
                <div class="col-span-12 md:col-span-3">
                    <label for="vacRepTo" class="block text-xs font-medium text-muted-color mb-1">{{ copy.reportsFilterDateTo }}</label>
                    <input id="vacRepTo" type="date" class="w-full p-inputtext p-component" [(ngModel)]="toDateInput" />
                </div>
                <div class="col-span-12 md:col-span-3">
                    <span id="lblVacRepClinic" class="block text-xs font-medium text-muted-color mb-1">{{ copy.reportsFilterClinic }}</span>
                    <p-select
                        ariaLabelledBy="lblVacRepClinic"
                        inputId="vacRepClinic"
                        [options]="clinicOptions()"
                        [(ngModel)]="clinicIdFilter"
                        optionLabel="label"
                        optionValue="value"
                        [placeholder]="copy.reportsClinicPanelDefault"
                        styleClass="w-full"
                        [showClear]="true"
                    />
                </div>
                <div class="col-span-12 md:col-span-3">
                    <span id="lblVacRepStatus" class="block text-xs font-medium text-muted-color mb-1">{{ copy.vaccinationsReportColStatus }}</span>
                    <p-select
                        ariaLabelledBy="lblVacRepStatus"
                        inputId="vacRepStatus"
                        [options]="statusOptions"
                        [(ngModel)]="statusFilter"
                        optionLabel="label"
                        optionValue="value"
                        [placeholder]="copy.filterPlaceholderAll"
                        styleClass="w-full"
                        [showClear]="true"
                    />
                </div>
                <div class="col-span-12 md:col-span-6">
                    <label for="vacRepSearch" class="block text-xs font-medium text-muted-color mb-1">{{ copy.reportsFilterSearch }}</label>
                    <input
                        pInputText
                        id="vacRepSearch"
                        class="w-full"
                        [(ngModel)]="searchInput"
                        [placeholder]="copy.vaccinationsReportSearchPlaceholder"
                        (keyup.enter)="applyFilters()"
                    />
                </div>
                <div class="col-span-12 md:col-span-6 flex flex-wrap gap-2 justify-end">
                    <p-button [label]="copy.buttonSearch" icon="pi pi-search" (onClick)="applyFilters()" [disabled]="loading()" />
                    <p-button [label]="copy.buttonClear" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
                    <p-button
                        [label]="copy.reportsExportXlsx"
                        icon="pi pi-file-excel"
                        severity="success"
                        (onClick)="exportXlsx()"
                        [loading]="isExporting('xlsx')"
                        [disabled]="loading() || exporting()"
                    />
                    <p-button
                        [label]="copy.reportsExportCsv"
                        icon="pi pi-download"
                        severity="help"
                        (onClick)="exportCsv()"
                        [loading]="isExporting('csv')"
                        [disabled]="loading() || exporting()"
                    />
                </div>
            </div>
        </div>

        @if (loading()) {
            <app-loading-state [message]="copy.reportsLoadingMessage" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (report(); as r) {
            <div class="card mb-4">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 sm:col-span-6">
                        <span class="block text-muted-color text-sm mb-1">{{ copy.reportsTotalRecords }}</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ r.totalCount }}</div>
                    </div>
                </div>
            </div>

            @if (r.items.length === 0) {
                <div class="card">
                    <app-empty-state [message]="copy.vaccinationsReportEmptyMessage" [hint]="copy.vaccinationsReportEmptyHint" />
                </div>
            } @else {
                <div class="card">
                    <div class="hidden lg:block overflow-x-auto">
                        <p-table
                            [value]="displayedRows()"
                            [paginator]="true"
                            [rows]="pageSize()"
                            [totalRecords]="r.totalCount"
                            [lazy]="true"
                            [first]="first()"
                            (onLazyLoad)="onTableLazyLoad($event)"
                            [tableStyle]="{ 'min-width': '92rem' }"
                            [showCurrentPageReport]="true"
                            currentPageReportTemplate="{first} - {last} / {totalRecords}"
                        >
                            <ng-template #header>
                                <tr>
                                    <th>{{ copy.vaccinationsReportColVaccinationDate }}</th>
                                    <th>{{ copy.reportsColClinic }}</th>
                                    <th>{{ copy.labelClient }}</th>
                                    <th>{{ copy.labelPet }}</th>
                                    <th>{{ copy.vaccinationsReportColVaccineName }}</th>
                                    <th>{{ copy.vaccinationsReportColStatus }}</th>
                                    <th>{{ copy.vaccinationsReportColAppliedAt }}</th>
                                    <th>{{ copy.vaccinationsReportColNextDue }}</th>
                                    <th>{{ copy.reportsColNotes }}</th>
                                    <th style="width: 6rem"></th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-row>
                                <tr>
                                    <td>{{ formatVaccinationDate(row.effectiveReportDateUtc) }}</td>
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
                                    <td class="max-w-[12rem] truncate" [title]="row.vaccineName">{{ row.vaccineName }}</td>
                                    <td>
                                        <app-status-tag [label]="statusLabel(row.status)" [severity]="statusSeverity(row.status)" />
                                    </td>
                                    <td>{{ formatUtcInstant(row.appliedAtUtc) }}</td>
                                    <td>{{ formatUtcInstant(row.dueAtUtc) }}</td>
                                    <td class="max-w-[12rem] truncate" [title]="row.notes">{{ row.notes }}</td>
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
                                <div class="text-sm text-muted-color mb-2">{{ formatVaccinationDate(row.effectiveReportDateUtc) }}</div>
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
                                @if (row.notes && row.notes !== '—') {
                                    <div class="text-sm text-muted-color break-words mb-2">
                                        <span class="font-medium">{{ copy.reportsColNotes }}: </span>{{ row.notes }}
                                    </div>
                                }
                                <div class="flex justify-end pt-2 border-t border-surface-200 dark:border-surface-700">
                                    <a [routerLink]="['/panel/vaccinations', row.id]" class="text-primary font-medium no-underline text-sm">{{ copy.buttonDetail }} →</a>
                                </div>
                            </div>
                        }
                    </div>

                    <div class="lg:hidden mt-4">
                        <p-paginator
                            [rows]="pageSize()"
                            [totalRecords]="r.totalCount"
                            [first]="first()"
                            [showCurrentPageReport]="true"
                            currentPageReportTemplate="{first} - {last} / {totalRecords}"
                            [rowsPerPageOptions]="[10, 25, 50]"
                            (onPageChange)="onMobilePageChange($event)"
                        />
                    </div>
                </div>
            }
        }
    `
})
export class VaccinationsReportPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    readonly reportTableRowTrackKey = reportTableRowTrackKey;
    private readonly reportService = inject(VaccinationsReportService);
    private readonly auth = inject(AuthService);

    readonly loading = signal(true);
    readonly exportKind = signal<'csv' | 'xlsx' | null>(null);
    readonly error = signal<string | null>(null);
    readonly exportError = signal<string | null>(null);
    readonly report = signal<VaccinationsReportResultVm | null>(null);

    readonly pageSize = signal(25);
    readonly first = signal(0);
    readonly currentPage = signal(1);

    readonly activeSearch = signal('');
    readonly activeFromDate = signal('');
    readonly activeToDate = signal('');
    readonly activeStatus = signal('');
    readonly activeClinicId = signal('');

    fromDateInput = '';
    toDateInput = '';
    searchInput = '';
    statusFilter = '';
    clinicIdFilter = '';

    readonly clinicOptions = signal<{ label: string; value: string }[]>([{ label: PANEL_COPY.reportsClinicPanelDefault, value: '' }]);
    readonly statusOptions = [
        { label: PANEL_COPY.filterPlaceholderAll, value: '' },
        { label: 'Planlandı', value: '0' },
        { label: 'Uygulandı', value: '1' },
        { label: 'İptal', value: '2' }
    ];

    readonly displayedRows = computed(() => [...(this.report()?.items ?? [])]);
    private suppressNextLazy = false;
    private lastLoadKey = '';

    readonly formatVaccinationDate = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly formatUtcInstant = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly statusLabel = vaccinationStatusLabel;
    readonly statusSeverity = vaccinationStatusSeverity;
    readonly exporting = () => this.exportKind() !== null;

    displayClinicLabel(clinicLabel: string): string {
        return clinicLabel === '—' ? this.copy.reportsClinicPanelDefault : clinicLabel;
    }

    isExporting(kind: 'csv' | 'xlsx'): boolean {
        return this.exportKind() === kind;
    }

    ngOnInit(): void {
        this.bootstrapDefaultDates();
        this.activeFromDate.set(this.fromDateInput.trim());
        this.activeToDate.set(this.toDateInput.trim());
        this.loadClinicOptions();
        this.suppressNextLazy = true;
        this.loadFromServer(1, this.pageSize());
    }

    applyFilters(): void {
        let from = this.fromDateInput?.trim() ?? '';
        let to = this.toDateInput?.trim() ?? '';
        if (!from && !to) {
            this.bootstrapDefaultDates();
            from = this.fromDateInput.trim();
            to = this.toDateInput.trim();
        }
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
        this.activeStatus.set(this.statusFilter.trim());
        this.activeClinicId.set(this.clinicIdFilter.trim());
        this.first.set(0);
        this.loadFromServer(1, this.pageSize());
    }

    resetFilters(): void {
        this.searchInput = '';
        this.statusFilter = '';
        this.clinicIdFilter = '';
        this.activeSearch.set('');
        this.activeStatus.set('');
        this.activeClinicId.set('');
        this.bootstrapDefaultDates();
        this.activeFromDate.set(this.fromDateInput.trim());
        this.activeToDate.set(this.toDateInput.trim());
        this.first.set(0);
        this.loadFromServer(1, this.pageSize());
    }

    reload(): void {
        this.loadFromServer(this.currentPage(), this.pageSize(), true);
    }

    onTableLazyLoad(event: TableLazyLoadEvent): void {
        if (this.suppressNextLazy) {
            this.suppressNextLazy = false;
            return;
        }
        const rows = event.rows ?? this.pageSize();
        const f = event.first ?? 0;
        const page = Math.floor(f / rows) + 1;
        this.loadFromServer(page, rows);
    }

    onMobilePageChange(state: PaginatorState): void {
        const rows = state.rows ?? this.pageSize();
        const f = state.first ?? 0;
        const page = Math.floor(f / rows) + 1;
        this.suppressNextLazy = true;
        this.loadFromServer(page, rows);
    }

    exportCsv(): void {
        this.export('csv');
    }

    exportXlsx(): void {
        this.export('xlsx');
    }

    private export(kind: 'csv' | 'xlsx'): void {
        this.exportError.set(null);
        this.exportKind.set(kind);
        const q = this.buildQuery(1, this.pageSize());
        const req$ = kind === 'xlsx' ? this.reportService.exportXlsxBlob(q) : this.reportService.exportCsvBlob(q);
        req$.subscribe({
            next: (res) => {
                this.exportKind.set(null);
                this.exportError.set(null);
                const blob = res.body;
                if (!blob) {
                    this.exportError.set(kind === 'xlsx' ? 'Excel yanıtı boş.' : 'CSV yanıtı boş.');
                    return;
                }
                const fromCd = fileNameFromContentDisposition(res.headers.get('Content-Disposition'));
                const ext = kind === 'xlsx' ? 'xlsx' : 'csv';
                const name = fromCd ?? `asi-raporu-${localDateYyyyMmDd()}.${ext}`;
                triggerBlobDownload(blob, name);
            },
            error: (e: Error) => {
                this.exportKind.set(null);
                this.exportError.set(e.message ?? (kind === 'xlsx' ? 'Excel indirilemedi.' : 'CSV indirilemedi.'));
            }
        });
    }

    private bootstrapDefaultDates(): void {
        this.fromDateInput = defaultReportFromYyyyMmDd();
        this.toDateInput = localDateYyyyMmDd();
    }

    private loadClinicOptions(): void {
        this.auth.getMyClinics().subscribe({
            next: (list) => {
                this.clinicOptions.set(mapMyClinicsToSelectOptions(list, this.copy.reportsClinicPanelDefault));
            },
            error: () => {
                this.clinicOptions.set([{ label: this.copy.reportsClinicPanelDefault, value: '' }]);
            }
        });
    }

    private buildQuery(page: number, pageSize: number): VaccinationsReportQuery {
        const clinicRaw = this.activeClinicId();
        const clinicId = typeof clinicRaw === 'string' && clinicRaw.trim() ? clinicRaw.trim() : undefined;
        return {
            page,
            pageSize,
            search: this.activeSearch() || undefined,
            from: this.activeFromDate().trim() || undefined,
            to: this.activeToDate().trim() || undefined,
            status: this.activeStatus() || undefined,
            clinicId
        };
    }

    private loadFromServer(page: number, pageSize: number, force = false): void {
        const q = this.buildQuery(page, pageSize);
        const key = `${q.page}|${q.pageSize}|${(q.search ?? '').trim()}|${(q.from ?? '').trim()}|${(q.to ?? '').trim()}|${(q.status ?? '').trim()}|${(q.clinicId ?? '').trim()}`;
        if (!force && key === this.lastLoadKey) {
            return;
        }
        this.lastLoadKey = key;
        this.loading.set(true);
        this.error.set(null);
        this.reportService.loadReport(q).subscribe({
            next: (r) => {
                this.report.set(r);
                this.pageSize.set(r.pageSize);
                this.currentPage.set(r.page);
                this.first.set((r.page - 1) * r.pageSize);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message ?? this.copy.reportsLoadErrorFallback);
                this.loading.set(false);
            }
        });
    }
}

function defaultReportFromYyyyMmDd(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
}
