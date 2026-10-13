import { debouncedAction } from '@/app/shared/ui/search-input/debounced-action';
import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Paginator } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/types/paginator';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import type { LabResultListItemVm, LabResultStatus } from '@/app/features/lab-results/models/lab-result-vm.model';
import { LabResultStatusBadgesComponent } from '@/app/features/lab-results/components/lab-result-status-badges.component';
import { LAB_RESULT_STATUS_FILTER_OPTIONS } from '@/app/features/lab-results/utils/lab-result-status.utils';
import { SelectModule } from 'primeng/select';
import { LabResultsService } from '@/app/features/lab-results/services/lab-results.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { LAB_RESULTS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';

@Component({
    selector: 'app-lab-results-list-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        TableModule,
        Paginator,
        ButtonModule,
        InputTextModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent, DateInputComponent, SearchInputComponent, SelectModule, LabResultStatusBadgesComponent
    ],
    template: `
        <app-page-header title="Lab sonuçları" description="Laboratuvar sonuç kayıtları.">
            @if (canCreateLabResult && !ro.mutationBlocked()) {
                <a actions routerLink="/panel/lab-results/new" pButton type="button" label="Yeni kayıt" icon="pi pi-plus" class="p-button-primary"></a>
            } @else if (canCreateLabResult && ro.mutationBlocked()) {
                <button
                    actions
                    pButton
                    type="button"
                    label="Yeni kayıt (salt okunur)"
                    icon="pi pi-lock"
                    [disabled]="true"
                    class="p-button-secondary"
                ></button>
            }
        </app-page-header>

        <div class="card">
            @if (loading()) {
                <app-loading-state message="Liste yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else {
                <div class="flex flex-col gap-4">
                    <div class="pb-3 border-b border-surface-200 dark:border-surface-700">
                        <div class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3 mb-3">
                            <div class="min-w-0">
                                <h5 class="m-0">Lab Sonuçları</h5>
                                @if (totalItems() > 0) {
                                    <span class="text-sm text-muted-color whitespace-nowrap">{{ totalItems() }} kayıt</span>
                                }
                            </div>
                            <div class="flex flex-col sm:flex-row gap-3 sm:items-end w-full xl:w-auto xl:min-w-[22rem] xl:max-w-2xl">
                                <div class="flex-1 min-w-0">
                                    <label for="lrSearch" class="block text-xs font-medium text-muted-color mb-1">Arama</label>
                                    <app-search-input inputId="lrSearch" placeholder="Test adı, müşteri veya hayvan…" [(value)]="searchInput" (search)="applyFilters()" />
                                </div>
                                <div class="flex flex-wrap gap-2 shrink-0">
                                    <p-button [label]="copy.buttonClear" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-12 gap-3 items-end">
                            <div class="col-span-12 md:col-span-4">
                                <label for="lrFrom" class="block text-xs font-medium text-muted-color mb-1">Başlangıç</label>
                                <app-date-input inputId="lrFrom" type="date" min="1900-01-01" [(ngModel)]="fromDateInput" limit="past" (ngModelChange)="scheduleApply()" />
                            </div>
                            <div class="col-span-12 md:col-span-4">
                                <label for="lrTo" class="block text-xs font-medium text-muted-color mb-1">Bitiş</label>
                                <app-date-input inputId="lrTo" type="date" min="1900-01-01" [(ngModel)]="toDateInput" limit="past" (ngModelChange)="scheduleApply()" />
                            </div>
                            <div class="col-span-12 md:col-span-4">
                                <label for="lrStatus" class="block text-xs font-medium text-muted-color mb-1">Durum</label>
                                <p-select
                                    inputId="lrStatus"
                                    [options]="statusOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    [(ngModel)]="statusInput"
                                    (ngModelChange)="applyFilters()"
                                    styleClass="w-full"
                                />
                            </div>
                        </div>
                    </div>
                @if (displayedRows().length === 0) {
                    <app-empty-state [message]="copy.listEmptyMessage" [hint]="copy.listEmptyHint" />
                } @else {
                    <div class="hidden lg:block overflow-x-auto">
                        <p-table
                            [value]="displayedRows()"
                            [paginator]="true"
                            [rows]="pageSize()"
                            [rowsPerPageOptions]="rowsPerPageOptions"
                            [paginatorDropdownAppendTo]="'body'"
                            [totalRecords]="totalItems()"
                            [lazy]="true"
                            [first]="first()"
                            (onLazyLoad)="onTableLazyLoad($event)"
                            [tableStyle]="{ 'min-width': '60rem' }"
                            [showCurrentPageReport]="true"
                            currentPageReportTemplate="{first} - {last} / {totalRecords}"
                        >
                            <ng-template #header>
                                <tr>
                                    <th>Tarih</th>
                                    <th>Durum</th>
                                    <th>Müşteri</th>
                                    <th>Hayvan</th>
                                    <th>Test</th>
                                    <th style="width: 8rem">İşlemler</th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-row>
                                <tr>
                                    <td>{{ formatDateTime(row.resultDateUtc ?? row.requestedAtUtc) }}</td>
                                    <td><app-lab-result-status-badges [status]="row.status" [awaitingInterpretation]="row.awaitingInterpretation" /></td>
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
                                    <td>{{ row.testName }}</td>
                                    <td>
                                        <a [routerLink]="['/panel/lab-results', row.id]" class="text-primary font-medium no-underline">Detay</a>
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
                                <div class="text-sm font-medium text-surface-900 dark:text-surface-0 min-w-0 mb-3">
                                    {{ formatDateTime(row.resultDateUtc ?? row.requestedAtUtc) }}
                                    <app-lab-result-status-badges class="ml-2" [status]="row.status" [awaitingInterpretation]="row.awaitingInterpretation" />
                                </div>
                                <div class="space-y-2 mb-3 min-w-0">
                                    <div class="text-sm">
                                        <span class="text-muted-color font-medium">Müşteri: </span>
                                        @if (row.clientId) {
                                            <a [routerLink]="['/panel/clients', row.clientId]" class="text-primary font-medium no-underline break-words">{{
                                                row.clientName
                                            }}</a>
                                        } @else {
                                            <span class="break-words">{{ row.clientName }}</span>
                                        }
                                    </div>
                                    <div class="text-sm">
                                        <span class="text-muted-color font-medium">Hayvan: </span>
                                        @if (row.petId) {
                                            <a [routerLink]="['/panel/pets', row.petId]" class="text-primary font-medium no-underline break-words">{{
                                                row.petName
                                            }}</a>
                                        } @else {
                                            <span class="break-words">{{ row.petName }}</span>
                                        }
                                    </div>
                                </div>
                                <div class="text-sm font-medium text-surface-900 dark:text-surface-0 mb-3 min-w-0 break-words">{{ row.testName }}</div>
                                <div class="flex justify-end pt-1 border-t border-surface-200 dark:border-surface-700">
                                    <a [routerLink]="['/panel/lab-results', row.id]" class="text-primary font-medium no-underline">Detay →</a>
                                </div>
                            </div>
                        }
                    </div>

                    <div class="lg:hidden mt-4">
                        <p-paginator
                            [rows]="pageSize()"
                            [totalRecords]="totalItems()"
                            [first]="first()"
                            [showCurrentPageReport]="true"
                            currentPageReportTemplate="{first} - {last} / {totalRecords}"
                            [rowsPerPageOptions]="rowsPerPageOptions"
                            (onPageChange)="onMobilePageChange($event)"
                        />
                    </div>
                }
                </div>
            }
        </div>
    `
})
export class LabResultsListPageComponent implements OnInit {
    protected readonly scheduleApply = debouncedAction(() => this.applyFilters());
    readonly copy = PANEL_COPY;
    readonly ro = inject(TenantReadOnlyContextService);
    private readonly auth = inject(AuthService);

    private readonly labResultsService = inject(LabResultsService);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);

    readonly rawItems = signal<LabResultListItemVm[]>([]);
    readonly totalItems = signal(0);
    readonly rowsPerPageOptions = [10, 20, 25, 50];
    readonly pageSize = signal(10);
    readonly first = signal(0);
    readonly currentPage = signal(1);

    readonly activeSearch = signal('');
    readonly activeFromDate = signal('');
    readonly activeToDate = signal('');
    readonly activeStatus = signal<LabResultStatus | ''>('');

    searchInput = '';
    fromDateInput = '';
    toDateInput = '';
    statusInput: LabResultStatus | '' = '';
    readonly statusOptions = LAB_RESULT_STATUS_FILTER_OPTIONS;
    readonly displayedRows = computed(() => this.rawItems());
    readonly canCreateLabResult = this.auth.hasOperationClaim(LAB_RESULTS_CREATE_CLAIM);

    readonly formatDateTime = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);

    private suppressNextLazy = false;
    private lastLoadKey = '';

    ngOnInit(): void {
        this.suppressNextLazy = true;
        this.loadFromServer(1, this.pageSize(), this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.activeStatus());
    }

    applyFilters(): void {
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
        this.activeStatus.set(this.statusInput);
        this.first.set(0);
        this.loadFromServer(1, this.pageSize(), this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.activeStatus());
    }

    resetFilters(): void {
        this.searchInput = '';
        this.fromDateInput = '';
        this.toDateInput = '';
        this.activeSearch.set('');
        this.activeFromDate.set('');
        this.activeToDate.set('');
        this.activeStatus.set('');
        this.statusInput = '';
        this.first.set(0);
        this.loadFromServer(1, this.pageSize(), '', '', '', '');
    }

    reload(): void {
        this.loadFromServer(
            this.currentPage(),
            this.pageSize(),
            this.activeSearch(),
            this.activeFromDate(),
            this.activeToDate(),
            this.activeStatus(),
            true
        );
    }

    onTableLazyLoad(event: TableLazyLoadEvent): void {
        if (this.suppressNextLazy) {
            this.suppressNextLazy = false;
            return;
        }
        const rows = event.rows ?? 10;
        const first = event.first ?? 0;
        const page = Math.floor(first / rows) + 1;
        this.loadFromServer(page, rows, this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.activeStatus());
    }

    onMobilePageChange(state: PaginatorState): void {
        const rows = state.rows ?? this.pageSize();
        const first = state.first ?? 0;
        const page = Math.floor(first / rows) + 1;
        this.suppressNextLazy = true;
        this.loadFromServer(page, rows, this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.activeStatus());
    }

    private loadFromServer(
        page: number,
        pageSize: number,
        search: string,
        fromDate: string,
        toDate: string,
        status: LabResultStatus | '',
        force = false
    ): void {
        const key = `${page}|${pageSize}|${search.trim()}|${fromDate.trim()}|${toDate.trim()}|${status}`;
        if (!force && key === this.lastLoadKey) {
            return;
        }
        this.lastLoadKey = key;
        this.loading.set(true);
        this.error.set(null);
        this.labResultsService
            .getLabResults({
                page,
                pageSize,
                search: search || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
                status: status || undefined
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
