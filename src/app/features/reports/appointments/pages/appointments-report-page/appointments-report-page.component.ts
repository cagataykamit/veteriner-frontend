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
import type { ClinicListItemVm } from '@/app/features/clinics/models/clinic-vm.model';
import { ClinicsService } from '@/app/features/clinics/services/clinics.service';
import { appointmentStatusLabel, appointmentStatusSeverity } from '@/app/features/appointments/utils/appointment-status.utils';
import type { AppointmentsReportQuery } from '@/app/features/reports/appointments/models/appointments-report-query.model';
import type { AppointmentsReportResultVm } from '@/app/features/reports/appointments/models/appointments-report.model';
import { AppointmentsReportService } from '@/app/features/reports/appointments/services/appointments-report.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { formatUtcIsoAsLocalDateTimeDisplay, localDateYyyyMmDd } from '@/app/shared/utils/date.utils';
import { fileNameFromContentDisposition, triggerBlobDownload } from '@/app/shared/utils/file-download.utils';

@Component({
    selector: 'app-appointments-report-page',
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
        <app-page-header
            [title]="copy.appointmentsReportTitle"
            [subtitle]="copy.reportsNavGroup"
            [description]="copy.appointmentsReportDescription"
        />

        @if (exportError()) {
            <div class="card mb-4 border-red-200 dark:border-red-800">
                <p class="text-red-500 m-0 text-sm" role="alert">{{ exportError() }}</p>
            </div>
        }

        <div class="card mb-4">
            <p class="text-sm text-muted-color m-0 mb-4">{{ copy.appointmentsReportDefaultPeriodHint }}</p>
            <div class="grid grid-cols-12 gap-3 items-end">
                <div class="col-span-12 md:col-span-3">
                    <label for="apptRepFrom" class="block text-xs font-medium text-muted-color mb-1">Tarih (Başlangıç)</label>
                    <input id="apptRepFrom" type="date" class="w-full p-inputtext p-component" [(ngModel)]="fromDateInput" />
                </div>
                <div class="col-span-12 md:col-span-3">
                    <label for="apptRepTo" class="block text-xs font-medium text-muted-color mb-1">Tarih (Bitiş)</label>
                    <input id="apptRepTo" type="date" class="w-full p-inputtext p-component" [(ngModel)]="toDateInput" />
                </div>
                <div class="col-span-12 md:col-span-3">
                    <label for="apptRepClinic" class="block text-xs font-medium text-muted-color mb-1">Klinik</label>
                    <p-select
                        inputId="apptRepClinic"
                        [options]="clinicOptions()"
                        [(ngModel)]="clinicIdFilter"
                        optionLabel="label"
                        optionValue="value"
                        [placeholder]="copy.paymentsReportClinicPanelDefault"
                        styleClass="w-full"
                        [showClear]="true"
                    />
                </div>
                <div class="col-span-12 md:col-span-3">
                    <label for="apptRepStatus" class="block text-xs font-medium text-muted-color mb-1">{{ copy.appointmentsReportColStatus }}</label>
                    <p-select
                        inputId="apptRepStatus"
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
                    <label for="apptRepSearch" class="block text-xs font-medium text-muted-color mb-1">Arama</label>
                    <input
                        pInputText
                        id="apptRepSearch"
                        class="w-full"
                        [(ngModel)]="searchInput"
                        [placeholder]="copy.appointmentsReportSearchPlaceholder"
                        (keyup.enter)="applyFilters()"
                    />
                </div>
                <div class="col-span-12 md:col-span-6 flex flex-wrap gap-2 justify-end">
                    <p-button [label]="copy.buttonSearch" icon="pi pi-search" (onClick)="applyFilters()" [disabled]="loading()" />
                    <p-button [label]="copy.buttonClear" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
                    <p-button
                        [label]="copy.appointmentsReportExportXlsx"
                        icon="pi pi-file-excel"
                        severity="success"
                        (onClick)="exportXlsx()"
                        [loading]="isExporting('xlsx')"
                        [disabled]="loading() || exporting()"
                    />
                    <p-button
                        [label]="copy.appointmentsReportExportCsv"
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
            <app-loading-state message="Rapor yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (report(); as r) {
            <div class="card mb-4">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 sm:col-span-6">
                        <span class="block text-muted-color text-sm mb-1">{{ copy.appointmentsReportTotalRecords }}</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ r.totalCount }}</div>
                    </div>
                </div>
            </div>

            @if (r.items.length === 0) {
                <div class="card">
                    <app-empty-state [message]="copy.appointmentsReportEmptyMessage" [hint]="copy.appointmentsReportEmptyHint" />
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
                            [tableStyle]="{ 'min-width': '76rem' }"
                            [showCurrentPageReport]="true"
                            currentPageReportTemplate="{first} - {last} / {totalRecords}"
                        >
                            <ng-template #header>
                                <tr>
                                    <th>{{ copy.appointmentsReportColScheduledAt }}</th>
                                    <th>{{ copy.paymentsReportColClinic }}</th>
                                    <th>{{ copy.labelClient }}</th>
                                    <th>{{ copy.labelPet }}</th>
                                    <th>{{ copy.appointmentsReportColStatus }}</th>
                                    <th>{{ copy.paymentsReportColNotes }}</th>
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
                                        <a [routerLink]="['/panel/appointments', row.id]" class="text-primary font-medium no-underline text-sm">Detay</a>
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
                                <div class="flex flex-wrap items-start justify-between gap-2 gap-y-1 mb-2">
                                    <div class="text-sm text-muted-color">{{ formatScheduledAt(row.scheduledAtUtc) }}</div>
                                    <app-status-tag [label]="statusLabel(row.status)" [severity]="statusSeverity(row.status)" />
                                </div>
                                <div class="text-sm mb-1">
                                    <span class="text-muted-color font-medium">{{ copy.paymentsReportColClinic }}: </span>{{ displayClinicLabel(row.clinicLabel) }}
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
                                        <span class="font-medium">{{ copy.paymentsReportColNotes }}: </span>{{ row.notes }}
                                    </div>
                                }
                                <div class="flex justify-end pt-2 border-t border-surface-200 dark:border-surface-700">
                                    <a [routerLink]="['/panel/appointments', row.id]" class="text-primary font-medium no-underline text-sm">Detay →</a>
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
export class AppointmentsReportPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    private readonly reportService = inject(AppointmentsReportService);
    private readonly clinicsService = inject(ClinicsService);

    readonly loading = signal(true);
    readonly exportKind = signal<'csv' | 'xlsx' | null>(null);
    readonly error = signal<string | null>(null);
    readonly exportError = signal<string | null>(null);
    readonly report = signal<AppointmentsReportResultVm | null>(null);

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

    readonly clinicOptions = signal<{ label: string; value: string }[]>([{ label: PANEL_COPY.paymentsReportClinicPanelDefault, value: '' }]);

    readonly statusOptions = [
        { label: 'Tümü', value: '' },
        { label: 'Planlandı', value: '0' },
        { label: 'Tamamlandı', value: '1' },
        { label: 'İptal', value: '2' }
    ];

    readonly displayedRows = computed(() => [...(this.report()?.items ?? [])]);
    private suppressNextLazy = false;
    private lastLoadKey = '';

    readonly formatScheduledAt = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly statusLabel = appointmentStatusLabel;
    readonly statusSeverity = appointmentStatusSeverity;

    readonly exporting = () => this.exportKind() !== null;

    displayClinicLabel(clinicLabel: string): string {
        return clinicLabel === '—' ? this.copy.paymentsReportClinicPanelDefault : clinicLabel;
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
                const name = fromCd ?? `randevu-raporu-${localDateYyyyMmDd()}.${ext}`;
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
        this.clinicsService.listClinics().subscribe({
            next: (list: ClinicListItemVm[]) => {
                const base = [{ label: this.copy.paymentsReportClinicPanelDefault, value: '' }];
                const opts = list.map((c) => ({ label: `${c.name} (${c.city})`, value: c.id }));
                this.clinicOptions.set([...base, ...opts]);
            },
            error: () => {
                this.clinicOptions.set([{ label: this.copy.paymentsReportClinicPanelDefault, value: '' }]);
            }
        });
    }

    private buildQuery(page: number, pageSize: number): AppointmentsReportQuery {
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
                this.error.set(e.message ?? 'Yükleme hatası');
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
