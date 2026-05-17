import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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
import type { ClinicSummary } from '@/app/core/auth/auth.models';
import { AuthService } from '@/app/core/auth/auth.service';
import { PAYMENTS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { mapMyClinicsToSelectOptions } from '@/app/features/reports/shared/map-my-clinics-to-select-options';
import {
    loadReportClientSelectOptions$,
    loadReportPetLookupBundle$
} from '@/app/features/reports/shared/report-client-pet-lookup';
import { isReportUiClinicIdMisalignedWithJwt, isReportUiClinicIdUnknownToMyClinics } from '@/app/features/reports/shared/report-my-clinic.utils';
import { paymentMethodLabel } from '@/app/features/payments/utils/payment-method.utils';
import type { PaymentsReportQuery } from '@/app/features/reports/payments/models/payments-report-query.model';
import { PaymentsReportService } from '@/app/features/reports/payments/services/payments-report.service';
import type { PaymentsReportResultVm } from '@/app/features/reports/payments/models/payments-report.model';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import {
    dateOnlyInputToIstanbulEndUtcIso,
    dateOnlyInputToIstanbulStartUtcIso,
    formatUtcIsoAsLocalDateTimeDisplay,
    localDateYyyyMmDd
} from '@/app/shared/utils/date.utils';
import { fileNameFromContentDisposition, triggerBlobDownload } from '@/app/shared/utils/file-download.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { reportTableRowTrackKey } from '@/app/shared/utils/report-row-track.utils';
import { isReportRecoverableClinicConstraint403, panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

type PaymentsReportState = {
    search: string;
    fromDate: string;
    toDate: string;
    method: string;
    clinicId: string;
    clientId: string;
    petId: string;
    page: number;
    pageSize: number;
};

const PAYMENTS_REPORT_STATE_KEY = 'panel:reports:payments:listState';

@Component({
    selector: 'app-payments-report-page',
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
        AppErrorStateComponent
    ],
    template: `
        <app-page-header
            [title]="copy.paymentsReportTitle"
            [subtitle]="copy.reportsNavGroup"
            [description]="copy.paymentsReportDescription"
        />

        @if (exportError()) {
            <div class="card mb-4 border-red-200 dark:border-red-800">
                <p class="text-red-500 m-0 text-sm" role="alert">{{ exportError() }}</p>
            </div>
        }

        <div class="card mb-4">
            @if (lookupWarning()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm m-0 mb-3" role="status">{{ lookupWarning() }}</p>
            }
            @if (dateFilterError()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm m-0 mb-3" role="status">{{ dateFilterError() }}</p>
            }
            <p class="text-sm text-muted-color m-0 mb-4">{{ copy.paymentsReportDefaultPeriodHint }}</p>
            <div class="grid grid-cols-12 gap-3 items-end">
                <div class="col-span-12 md:col-span-3 rounded-lg border p-2 transition-colors" [ngClass]="filterBoxClass(isFromDateActive())">
                    <label for="repFrom" class="flex items-center gap-2 text-xs font-medium mb-1" [ngClass]="filterLabelClass(isFromDateActive())">
                        {{ copy.reportsFilterDateFrom }}
                        @if (isFromDateActive()) {
                            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100">
                                Aktif
                            </span>
                        }
                    </label>
                    <input
                        id="repFrom"
                        type="date"
                        class="w-full p-inputtext p-component"
                        [ngClass]="activeInputClass(isFromDateActive())"
                        [(ngModel)]="fromDateInput"
                    />
                </div>
                <div class="col-span-12 md:col-span-3 rounded-lg border p-2 transition-colors" [ngClass]="filterBoxClass(isToDateActive())">
                    <label for="repTo" class="flex items-center gap-2 text-xs font-medium mb-1" [ngClass]="filterLabelClass(isToDateActive())">
                        {{ copy.reportsFilterDateTo }}
                        @if (isToDateActive()) {
                            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100">
                                Aktif
                            </span>
                        }
                    </label>
                    <input
                        id="repTo"
                        type="date"
                        class="w-full p-inputtext p-component"
                        [ngClass]="activeInputClass(isToDateActive())"
                        [(ngModel)]="toDateInput"
                    />
                </div>
                <div class="col-span-12 md:col-span-3 rounded-lg border p-2 transition-colors" [ngClass]="filterBoxClass(isClinicActive())">
                    <span id="lblRepClinic" class="flex items-center gap-2 text-xs font-medium mb-1" [ngClass]="filterLabelClass(isClinicActive())">
                        {{ copy.reportsFilterClinic }}
                        @if (isClinicActive()) {
                            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100">
                                Aktif
                            </span>
                        }
                    </span>
                    <p-select
                        ariaLabelledBy="lblRepClinic"
                        inputId="repClinic"
                        [options]="clinicOptions()"
                        [(ngModel)]="clinicIdFilter"
                        optionLabel="label"
                        optionValue="value"
                        [placeholder]="copy.reportsClinicPanelDefault"
                        styleClass="w-full"
                        [showClear]="true"
                    />
                </div>
                <div class="col-span-12 md:col-span-3 rounded-lg border p-2 transition-colors" [ngClass]="filterBoxClass(isMethodActive())">
                    <span id="lblRepMethod" class="flex items-center gap-2 text-xs font-medium mb-1" [ngClass]="filterLabelClass(isMethodActive())">
                        {{ copy.paymentsReportColMethod }}
                        @if (isMethodActive()) {
                            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100">
                                Aktif
                            </span>
                        }
                    </span>
                    <p-select
                        ariaLabelledBy="lblRepMethod"
                        inputId="repMethod"
                        [options]="methodOptions"
                        [(ngModel)]="methodFilter"
                        optionLabel="label"
                        optionValue="value"
                        [placeholder]="copy.filterPlaceholderAll"
                        styleClass="w-full"
                        [showClear]="true"
                    />
                </div>
                <div class="col-span-12 md:col-span-6 rounded-lg border p-2 transition-colors" [ngClass]="filterBoxClass(isClientFilterActive())">
                    <span id="lblPayRepClient" class="flex items-center gap-2 text-xs font-medium mb-1" [ngClass]="filterLabelClass(isClientFilterActive())">
                        {{ copy.labelClient }}
                        @if (isClientFilterActive()) {
                            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100">
                                Aktif
                            </span>
                        }
                    </span>
                    <p-select
                        ariaLabelledBy="lblPayRepClient"
                        inputId="payRepClient"
                        [options]="clientSelectOptions()"
                        [(ngModel)]="clientIdFilter"
                        (ngModelChange)="onClientFilterNgModelChange()"
                        optionLabel="label"
                        optionValue="value"
                        [placeholder]="copy.filterPlaceholderAll"
                        styleClass="w-full"
                        [showClear]="true"
                        [filter]="true"
                        filterBy="label"
                        [loading]="loadingClientOptions()"
                    />
                </div>
                <div class="col-span-12 md:col-span-6 rounded-lg border p-2 transition-colors" [ngClass]="filterBoxClass(isPetFilterActive())">
                    <span id="lblPayRepPet" class="flex items-center gap-2 text-xs font-medium mb-1" [ngClass]="filterLabelClass(isPetFilterActive())">
                        {{ copy.labelPet }}
                        @if (isPetFilterActive()) {
                            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100">
                                Aktif
                            </span>
                        }
                    </span>
                    <p-select
                        ariaLabelledBy="lblPayRepPet"
                        inputId="payRepPet"
                        [options]="petSelectOptions()"
                        [(ngModel)]="petIdFilter"
                        optionLabel="label"
                        optionValue="value"
                        [placeholder]="copy.filterPlaceholderAll"
                        styleClass="w-full"
                        [showClear]="true"
                        [filter]="true"
                        filterBy="label"
                        [loading]="loadingPetOptions()"
                    />
                </div>
                <div class="col-span-12 md:col-span-6 rounded-lg border p-2 transition-colors" [ngClass]="filterBoxClass(isSearchActive())">
                    <label for="repSearch" class="flex items-center gap-2 text-xs font-medium mb-1" [ngClass]="filterLabelClass(isSearchActive())">
                        {{ copy.reportsFilterSearch }}
                        @if (isSearchActive()) {
                            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100">
                                Aktif
                            </span>
                        }
                    </label>
                    <input
                        pInputText
                        id="repSearch"
                        class="w-full"
                        [ngClass]="activeInputClass(isSearchActive())"
                        [(ngModel)]="searchInput"
                        [placeholder]="copy.paymentsReportSearchPlaceholder"
                        (keyup.enter)="applyFilters()"
                    />
                </div>
                <div class="col-span-12 md:col-span-6 flex flex-wrap gap-2 justify-end">
                    <p-button [label]="copy.buttonSearch" icon="pi pi-search" (onClick)="applyFilters()" [disabled]="loading()" />
                    <p-button [label]="copy.buttonClear" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
                    @if (canExportReport()) {
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
                    }
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
                    <div class="col-span-12 sm:col-span-6">
                        <span class="block text-muted-color text-sm mb-1">{{ copy.paymentsReportTotalAmount }}</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ formatMoneyLine(r.totalAmount) }}</div>
                    </div>
                </div>
            </div>

            @if (r.items.length === 0) {
                <div class="card">
                    <app-empty-state [message]="copy.paymentsReportEmptyMessage" [hint]="copy.paymentsReportEmptyHint" />
                </div>
            } @else {
                <div class="card">
                    <div class="hidden lg:block overflow-x-auto">
                        <p-table
                            [value]="displayedRows()"
                            [paginator]="true"
                            [rows]="pageSize()"
                            [rowsPerPageOptions]="rowsPerPageOptions"
                            [paginatorDropdownAppendTo]="'body'"
                            [totalRecords]="r.totalCount"
                            [lazy]="true"
                            [first]="first()"
                            (onLazyLoad)="onTableLazyLoad($event)"
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
                            <div
                                class="rounded-border border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4 shadow-sm"
                            >
                                <div class="text-sm text-muted-color mb-2">{{ formatPaidAt(row.paidAtUtc) }}</div>
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
                                <div class="font-medium mb-1">{{ money(row.amount, row.currency) }} {{ row.currency }}</div>
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

                    <div class="lg:hidden mt-4">
                        <p-paginator
                            [rows]="pageSize()"
                            [totalRecords]="r.totalCount"
                            [first]="first()"
                            [showCurrentPageReport]="true"
                            currentPageReportTemplate="{first} - {last} / {totalRecords}"
                            [rowsPerPageOptions]="rowsPerPageOptions"
                            (onPageChange)="onMobilePageChange($event)"
                        />
                    </div>
                </div>
            }
        }
    `
})
export class PaymentsReportPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    readonly reportTableRowTrackKey = reportTableRowTrackKey;
    private readonly reportService = inject(PaymentsReportService);
    private readonly auth = inject(AuthService);
    private readonly clientsService = inject(ClientsService);
    private readonly petsService = inject(PetsService);

    readonly canExportReport = computed(() => this.auth.hasOperationClaim(PAYMENTS_READ_CLAIM));

    readonly loading = signal(true);
    readonly exportKind = signal<'csv' | 'xlsx' | null>(null);
    readonly error = signal<string | null>(null);
    readonly exportError = signal<string | null>(null);
    readonly lookupWarning = signal<string | null>(null);
    readonly dateFilterError = signal<string | null>(null);
    readonly report = signal<PaymentsReportResultVm | null>(null);

    readonly rowsPerPageOptions = [10, 20, 25, 50];
    readonly pageSize = signal(25);
    readonly first = signal(0);
    readonly currentPage = signal(1);

    readonly activeSearch = signal('');
    readonly activeFromDate = signal('');
    readonly activeToDate = signal('');
    readonly activeMethod = signal('');
    readonly activeClinicId = signal('');
    readonly activeClientId = signal('');
    readonly activePetId = signal('');

    fromDateInput = '';
    toDateInput = '';
    searchInput = '';
    methodFilter = '';
    clinicIdFilter = '';
    clientIdFilter = '';
    petIdFilter = '';

    readonly clinicOptions = signal<{ label: string; value: string }[]>([{ label: PANEL_COPY.reportsClinicPanelDefault, value: '' }]);
    readonly loadingClientOptions = signal(false);
    readonly loadingPetOptions = signal(false);
    readonly clientSelectOptions = signal<{ label: string; value: string }[]>([{ label: PANEL_COPY.filterPlaceholderAll, value: '' }]);
    readonly petSelectOptions = signal<{ label: string; value: string }[]>([{ label: PANEL_COPY.filterPlaceholderAll, value: '' }]);

    readonly methodOptions = [
        { label: PANEL_COPY.filterPlaceholderAll, value: '' },
        { label: 'Nakit', value: 'cash' },
        { label: 'Kart', value: 'card' },
        { label: 'Havale / EFT', value: 'transfer' }
    ];

    readonly displayedRows = computed(() => [...(this.report()?.items ?? [])]);
    private suppressNextLazy = false;
    private lastLoadKey = '';
    private clinicSummariesLoadedOk = false;
    private latestReportLoadSeq = 0;

    readonly formatPaidAt = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly money = (amount: number | null, currency: string) => formatMoney(amount, currency || 'TRY');
    readonly methodLabel = paymentMethodLabel;

    readonly exporting = () => this.exportKind() !== null;

    displayClinicLabel(clinicLabel: string): string {
        return clinicLabel === '—' ? this.copy.reportsClinicPanelDefault : clinicLabel;
    }

    isExporting(kind: 'csv' | 'xlsx'): boolean {
        return this.exportKind() === kind;
    }

    ngOnInit(): void {
        const restored = this.restoreStateFromSessionStorage();
        if (!restored) {
            this.bootstrapDefaultDates();
            this.activeFromDate.set(this.fromDateInput.trim());
            this.activeToDate.set(this.toDateInput.trim());
            this.currentPage.set(1);
            this.first.set(0);
        }
        this.suppressNextLazy = true;
        this.bootstrapClientPetLookups();
        this.bootstrapReportAfterMyClinics();
    }

    onClientFilterNgModelChange(): void {
        this.reloadPetSelectOptions();
    }

    private bootstrapClientPetLookups(): void {
        this.loadingClientOptions.set(true);
        loadReportClientSelectOptions$(this.clientsService, this.copy.filterPlaceholderAll).subscribe({
            next: (opts) => {
                this.lookupWarning.set(null);
                this.clientSelectOptions.set(opts);
                this.loadingClientOptions.set(false);
                this.reloadPetSelectOptions();
            },
            error: () => {
                this.lookupWarning.set(this.copy.reportsClientPetLookupError);
                this.loadingClientOptions.set(false);
                this.reloadPetSelectOptions();
            }
        });
    }

    private reloadPetSelectOptions(): void {
        this.loadingPetOptions.set(true);
        const clientId = (typeof this.clientIdFilter === 'string' ? this.clientIdFilter : '').trim();
        loadReportPetLookupBundle$(this.petsService, this.copy.filterPlaceholderAll, clientId || undefined).subscribe({
            next: ({ options, pets }) => {
                this.petSelectOptions.set(options);
                const pid = (typeof this.petIdFilter === 'string' ? this.petIdFilter : '').trim();
                if (pid && !pets.some((p) => p.id === pid)) {
                    this.petIdFilter = '';
                }
                this.loadingPetOptions.set(false);
            },
            error: () => {
                this.lookupWarning.set(this.copy.reportsClientPetLookupError);
                this.loadingPetOptions.set(false);
            }
        });
    }

    formatMoneyLine(n: number): string {
        return formatMoney(n, 'TRY');
    }

    applyFilters(): void {
        this.dateFilterError.set(null);
        const safeTrim = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

        let from = safeTrim(this.fromDateInput);
        let to = safeTrim(this.toDateInput);

        // Backend sözleşmesi: from/to zorunlu. UI'de iki tarih birlikte seçilir.
        if ((from && !to) || (!from && to)) {
            this.dateFilterError.set(this.copy.reportsDateRangeBothRequired);
            return;
        }
        if (!from && !to) {
            this.bootstrapDefaultDates();
            from = safeTrim(this.fromDateInput);
            to = safeTrim(this.toDateInput);
        }
        if (from && to && from > to) {
            const t = from;
            from = to;
            to = t;
            this.fromDateInput = from;
            this.toDateInput = to;
        }
        this.activeSearch.set(safeTrim(this.searchInput));
        this.activeFromDate.set(from);
        this.activeToDate.set(to);
        this.activeMethod.set(safeTrim(this.methodFilter));
        this.activeClinicId.set(safeTrim(this.clinicIdFilter));
        this.activeClientId.set(safeTrim(this.clientIdFilter));
        this.activePetId.set(safeTrim(this.petIdFilter));
        this.stripJwtMisalignedReportClinicIfNeeded();
        this.first.set(0);
        this.currentPage.set(1);
        this.persistStateToSessionStorage(1, this.pageSize());
        this.loadFromServer(1, this.pageSize());
    }

    resetFilters(): void {
        this.dateFilterError.set(null);
        this.searchInput = '';
        this.methodFilter = '';
        this.clinicIdFilter = '';
        this.clientIdFilter = '';
        this.petIdFilter = '';
        this.activeSearch.set('');
        this.activeMethod.set('');
        this.activeClinicId.set('');
        this.activeClientId.set('');
        this.activePetId.set('');
        this.bootstrapDefaultDates();
        this.activeFromDate.set(this.fromDateInput.trim());
        this.activeToDate.set(this.toDateInput.trim());
        this.first.set(0);
        this.currentPage.set(1);
        this.clearStateFromSessionStorage();
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
        const eventFirst = event.first ?? 0;
        const rowsChanged = rows !== this.pageSize();

        if (rowsChanged) {
            this.first.set(0);
            this.currentPage.set(1);
            this.persistStateToSessionStorage(1, rows);
            this.loadFromServer(1, rows);
            return;
        }

        const page = Math.floor(eventFirst / rows) + 1;
        this.persistStateToSessionStorage(page, rows);
        this.loadFromServer(page, rows);
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
            this.loadFromServer(1, rows);
            return;
        }

        const page = Math.floor(eventFirst / rows) + 1;
        this.persistStateToSessionStorage(page, rows);
        this.loadFromServer(page, rows);
    }

    exportCsv(): void {
        this.export('csv');
    }

    exportXlsx(): void {
        this.export('xlsx');
    }

    private export(kind: 'csv' | 'xlsx'): void {
        if (!this.auth.hasOperationClaim(PAYMENTS_READ_CLAIM)) {
            return;
        }
        this.exportError.set(null);
        this.exportKind.set(kind);
        this.sanitizeExportClinicFilterIfStale();
        const q = this.buildQuery(1, this.pageSize());
        const req$ = kind === 'xlsx' ? this.reportService.exportXlsxBlob(q) : this.reportService.exportCsvBlob(q);
        req$.subscribe({
            next: (res) => {
                this.exportKind.set(null);
                this.exportError.set(null);
                const blob = res.body;
                if (!blob) {
                    this.exportError.set(this.copy.reportsExportResponseEmpty);
                    return;
                }
                const fromCd = fileNameFromContentDisposition(res.headers.get('Content-Disposition'));
                const ext = kind === 'xlsx' ? 'xlsx' : 'csv';
                const name = fromCd ?? `odeme-raporu-${localDateYyyyMmDd()}.${ext}`;
                triggerBlobDownload(blob, name);
            },
            error: (e: Error) => {
                this.exportKind.set(null);
                this.exportError.set(e.message?.trim() || this.copy.reportsExportFailedFallback);
            }
        });
    }

    private bootstrapDefaultDates(): void {
        this.fromDateInput = defaultReportFromYyyyMmDd();
        this.toDateInput = localDateYyyyMmDd();
    }

    private bootstrapReportAfterMyClinics(): void {
        this.auth.getMyClinics().subscribe({
            next: (list: ClinicSummary[]) => {
                this.clinicSummariesLoadedOk = true;
                this.clinicOptions.set(mapMyClinicsToSelectOptions(list, this.copy.reportsClinicPanelDefault));
                const stale = this.clearStaleRestoredClinicIfNeeded(list);
                if (stale) {
                    this.suppressNextLazy = true;
                    this.loadFromServer(1, this.pageSize(), true);
                } else {
                    this.loadFromServer(this.currentPage(), this.pageSize());
                }
            },
            error: () => {
                this.clinicSummariesLoadedOk = false;
                this.clinicOptions.set([{ label: this.copy.reportsClinicPanelDefault, value: '' }]);
                this.loadFromServer(this.currentPage(), this.pageSize());
            }
        });
    }

    private clearStaleRestoredClinicIfNeeded(summaries: ClinicSummary[]): boolean {
        const id = this.activeClinicId().trim();
        if (!id) {
            return false;
        }
        const jwtClinic = this.auth.getJwtClinicId();
        if (
            isReportUiClinicIdUnknownToMyClinics(id, summaries) ||
            isReportUiClinicIdMisalignedWithJwt(id, jwtClinic)
        ) {
            this.clearStaleUiClinicFilterSilently();
            return true;
        }
        return false;
    }

    /** JWT ile uyumsuz rapor filtresini sayfa konumunu koruyarak kaldırır (sayfalama / lazy load). */
    private clearJwtMisalignedUiClinicOnly(): void {
        this.clinicIdFilter = '';
        this.activeClinicId.set('');
        this.persistStateToSessionStorage(this.currentPage(), this.pageSize());
    }

    private stripJwtMisalignedReportClinicIfNeeded(): void {
        const id = this.activeClinicId().trim();
        if (!id) {
            return;
        }
        if (isReportUiClinicIdMisalignedWithJwt(id, this.auth.getJwtClinicId())) {
            this.clearJwtMisalignedUiClinicOnly();
        }
    }

    private clearStaleUiClinicFilterSilently(): void {
        this.clinicIdFilter = '';
        this.activeClinicId.set('');
        this.first.set(0);
        this.currentPage.set(1);
        this.persistStateToSessionStorage(1, this.pageSize());
    }

    private sanitizeExportClinicFilterIfStale(): void {
        if (!this.clinicSummariesLoadedOk) {
            return;
        }
        const id = this.activeClinicId().trim();
        if (!id) {
            return;
        }
        const jwtClinic = this.auth.getJwtClinicId();
        if (!this.clinicOptions().some((o) => o.value === id)) {
            this.clearStaleUiClinicFilterSilently();
            return;
        }
        if (isReportUiClinicIdMisalignedWithJwt(id, jwtClinic)) {
            this.clearJwtMisalignedUiClinicOnly();
        }
    }

    private buildQuery(page: number, pageSize: number): PaymentsReportQuery {
        const clinicRaw = this.activeClinicId();
        const clinicId = typeof clinicRaw === 'string' && clinicRaw.trim() ? clinicRaw.trim() : undefined;
        const fromYmd = this.activeFromDate().trim();
        const toYmd = this.activeToDate().trim();
        const fromUtc = fromYmd ? dateOnlyInputToIstanbulStartUtcIso(fromYmd) : '';
        const toUtc = toYmd ? dateOnlyInputToIstanbulEndUtcIso(toYmd) : '';
        const clientId = this.activeClientId().trim() || undefined;
        const petId = this.activePetId().trim() || undefined;
        return {
            page,
            pageSize,
            search: this.activeSearch() || undefined,
            from: fromUtc || undefined,
            to: toUtc || undefined,
            method: this.activeMethod() || undefined,
            clinicId,
            clientId,
            petId
        };
    }

    private loadFromServer(page: number, pageSize: number, force = false): void {
        this.stripJwtMisalignedReportClinicIfNeeded();
        const q = this.buildQuery(page, pageSize);
        const explicitQueryClinicId = !!q.clinicId;
        const requestKey = JSON.stringify(q);
        if (!force && requestKey === this.lastLoadKey) {
            return;
        }
        this.lastLoadKey = requestKey;
        const seq = ++this.latestReportLoadSeq;
        this.loading.set(true);
        this.error.set(null);
        this.reportService.loadReport(q).subscribe({
            next: (r) => {
                if (seq !== this.latestReportLoadSeq) {
                    return;
                }
                this.report.set(r);
                this.pageSize.set(r.pageSize);
                this.currentPage.set(r.page);
                this.first.set((r.page - 1) * r.pageSize);
                this.persistStateToSessionStorage(r.page, r.pageSize);
                this.loading.set(false);
            },
            error: (err: unknown) => {
                if (seq !== this.latestReportLoadSeq) {
                    return;
                }
                if (
                    err instanceof HttpErrorResponse &&
                    explicitQueryClinicId &&
                    isReportRecoverableClinicConstraint403(err)
                ) {
                    this.lastLoadKey = '';
                    this.clearStaleUiClinicFilterSilently();
                    this.suppressNextLazy = true;
                    this.loadFromServer(1, this.pageSize(), true);
                    return;
                }
                this.error.set(panelHttpFailureMessage(err, this.copy.reportsLoadErrorFallback));
                this.loading.set(false);
            }
        });
    }

    isSearchActive(): boolean {
        return !!this.activeSearch().trim();
    }

    isFromDateActive(): boolean {
        return !!this.activeFromDate().trim();
    }

    isToDateActive(): boolean {
        return !!this.activeToDate().trim();
    }

    isMethodActive(): boolean {
        return !!this.activeMethod().trim();
    }

    isClinicActive(): boolean {
        return !!this.activeClinicId().trim();
    }

    isClientFilterActive(): boolean {
        return !!this.activeClientId().trim();
    }

    isPetFilterActive(): boolean {
        return !!this.activePetId().trim();
    }

    filterBoxClass(active: boolean): string {
        return active
            ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
            : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900';
    }

    filterLabelClass(active: boolean): string {
        return active ? 'text-primary-800 dark:text-primary-200' : 'text-muted-color';
    }

    activeInputClass(active: boolean): string {
        return active ? 'border-primary-300 dark:border-primary-600 bg-primary-50/30 dark:bg-primary-900/15' : '';
    }

    private restoreStateFromSessionStorage(): boolean {
        const raw = sessionStorage.getItem(PAYMENTS_REPORT_STATE_KEY);
        if (!raw) {
            return false;
        }
        try {
            const parsed = JSON.parse(raw) as Partial<PaymentsReportState>;
            const page = Number(parsed.page);
            const pageSize = Number(parsed.pageSize);
            if (!Number.isFinite(page) || page < 1 || !Number.isFinite(pageSize) || pageSize < 1) {
                sessionStorage.removeItem(PAYMENTS_REPORT_STATE_KEY);
                return false;
            }
            const safeTrim = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
            this.searchInput = safeTrim(parsed.search);
            this.fromDateInput = safeTrim(parsed.fromDate);
            this.toDateInput = safeTrim(parsed.toDate);
            this.methodFilter = safeTrim(parsed.method);
            this.clinicIdFilter = safeTrim(parsed.clinicId);
            this.clientIdFilter = safeTrim(parsed.clientId);
            this.petIdFilter = safeTrim(parsed.petId);

            // Tarihler restore'da tek taraflı geldiyse varsayılan döneme dön.
            const from = safeTrim(this.fromDateInput);
            const to = safeTrim(this.toDateInput);
            if ((from && !to) || (!from && to)) {
                this.bootstrapDefaultDates();
                this.fromDateInput = safeTrim(this.fromDateInput);
                this.toDateInput = safeTrim(this.toDateInput);
            }

            this.activeSearch.set(safeTrim(this.searchInput));
            this.activeFromDate.set(safeTrim(this.fromDateInput));
            this.activeToDate.set(safeTrim(this.toDateInput));
            this.activeMethod.set(safeTrim(this.methodFilter));
            this.activeClinicId.set(safeTrim(this.clinicIdFilter));
            this.activeClientId.set(safeTrim(this.clientIdFilter));
            this.activePetId.set(safeTrim(this.petIdFilter));
            this.pageSize.set(pageSize);
            this.currentPage.set(page);
            this.first.set((page - 1) * pageSize);
            return true;
        } catch {
            sessionStorage.removeItem(PAYMENTS_REPORT_STATE_KEY);
            return false;
        }
    }

    private persistStateToSessionStorage(page: number, pageSize: number): void {
        const safeTrim = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
        const state: PaymentsReportState = {
            search: safeTrim(this.searchInput),
            fromDate: safeTrim(this.fromDateInput),
            toDate: safeTrim(this.toDateInput),
            method: safeTrim(this.methodFilter),
            clinicId: safeTrim(this.clinicIdFilter),
            clientId: safeTrim(this.clientIdFilter),
            petId: safeTrim(this.petIdFilter),
            page,
            pageSize
        };
        sessionStorage.setItem(PAYMENTS_REPORT_STATE_KEY, JSON.stringify(state));
    }

    private clearStateFromSessionStorage(): void {
        sessionStorage.removeItem(PAYMENTS_REPORT_STATE_KEY);
    }
}

function defaultReportFromYyyyMmDd(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
}
