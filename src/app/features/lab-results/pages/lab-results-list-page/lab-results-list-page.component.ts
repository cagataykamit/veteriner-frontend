import { debouncedAction } from '@/app/shared/ui/search-input/debounced-action';
import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AppContextFilterChipComponent } from '@/app/shared/ui/context-filter-chip/app-context-filter-chip.component';
import { CLEAR_CONTEXT_FILTER_QUERY, readContextFilterParam } from '@/app/shared/utils/context-filter.utils';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Paginator } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/types/paginator';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import type { LabResultListItemVm, LabResultStatus } from '@/app/features/lab-results/models/lab-result-vm.model';
import { LabResultStatusBadgesComponent } from '@/app/features/lab-results/components/lab-result-status-badges.component';
import { LabResultCancelDialogComponent } from '@/app/features/lab-results/components/lab-result-cancel-dialog.component';
import { isLabResultEditable, LAB_RESULT_STATUS_FILTER_OPTIONS, labResultEditLabel } from '@/app/features/lab-results/utils/lab-result-status.utils';
import { SelectModule } from 'primeng/select';
import { LabResultsService } from '@/app/features/lab-results/services/lab-results.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { LAB_RESULTS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';

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
        AppListHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppContextFilterChipComponent, AppErrorStateComponent, DateInputComponent, SearchInputComponent, SelectModule, LabResultStatusBadgesComponent,
        AppRowActionButtonComponent,
        LabResultCancelDialogComponent
    ],
    template: `
        @if (contextPetId()) {
            <app-context-filter-chip label="Seçili hastanın kayıtları gösteriliyor" (clear)="clearContextFilter()" />
        }

        <div class="card">
                <div class="flex flex-col gap-4">
                    <div class="pb-3 border-b border-surface-200 dark:border-surface-700">
                        <app-list-header class="mb-3" title="Lab sonuçları" [count]="totalItems()">
                            <div class="flex-1 min-w-0">
                                <label for="lrSearch" class="block text-xs font-medium text-muted-color mb-1">Arama</label>
                                <app-search-input inputId="lrSearch" placeholder="Test adı, müşteri veya hasta…" [(value)]="searchInput" (searchRequested)="applyFilters()" />
                            </div>
                            <p-button actions [label]="copy.buttonClear" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
                        </app-list-header>
                        <div class="grid grid-cols-12 gap-3 items-end">
                            <div class="col-span-12 md:col-span-4">
                                <label for="lrFrom" class="block text-xs font-medium text-muted-color mb-1">İstem tarihi (başlangıç)</label>
                                <app-date-input inputId="lrFrom" type="date" min="1900-01-01" [(ngModel)]="fromDateInput" limit="past" (ngModelChange)="scheduleApply()" />
                            </div>
                            <div class="col-span-12 md:col-span-4">
                                <label for="lrTo" class="block text-xs font-medium text-muted-color mb-1">İstem tarihi (bitiş)</label>
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
            @if (loading()) {
                <app-loading-state message="Liste yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else {
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
                                    <th>İstem tarihi</th>
                                    <th>Sonuç tarihi</th>
                                    <th>Durum</th>
                                    <th>Müşteri</th>
                                    <th>Hasta</th>
                                    <th>Test</th>
                                    <th style="width: 8rem">İşlemler</th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-row>
                                <tr>
                                    <td data-testid="lr-requested-at">{{ formatDateTime(row.requestedAtUtc) }}</td>
                                    <td data-testid="lr-result-date">{{ formatDateTime(row.resultDateUtc) }}</td>
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
                                        <div class="flex items-center gap-1">
                                            <app-row-action-button action="detail" [link]="['/panel/lab-results', row.id]" />
                                            @if (canEditRow(row) && !ro.mutationBlocked()) {
                                                <app-row-action-button action="edit" [label]="editLabel(row.status)" [link]="['/panel/lab-results', row.id, 'edit']" />
                                            } @else if (canEditRow(row) && ro.mutationBlocked()) {
                                                <app-row-action-button action="edit" [label]="editLabel(row.status) + ' (salt okunur)'" [disabled]="true" />
                                            }
                                            @if (canEditRow(row) && !ro.mutationBlocked()) {
                                                <app-row-action-button action="void" (pressed)="openCancel(row)" />
                                            }
                                        </div>
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
                                    <span class="text-muted-color">İstem: </span>{{ formatDateTime(row.requestedAtUtc) }}
                                    <app-lab-result-status-badges class="ml-2" [status]="row.status" [awaitingInterpretation]="row.awaitingInterpretation" />
                                </div>
                                <div class="space-y-2 mb-3 min-w-0">
                                    <div class="text-sm">
                                        <span class="text-muted-color font-medium">Sonuç tarihi: </span>{{ formatDateTime(row.resultDateUtc) }}
                                    </div>
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
                                        <span class="text-muted-color font-medium">Hasta: </span>
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
                                <div class="flex justify-end items-center gap-1 pt-1 border-t border-surface-200 dark:border-surface-700">
                                    <app-row-action-button action="detail" [link]="['/panel/lab-results', row.id]" />
                                    @if (canEditRow(row) && !ro.mutationBlocked()) {
                                        <app-row-action-button action="edit" [label]="editLabel(row.status)" [link]="['/panel/lab-results', row.id, 'edit']" />
                                    } @else if (canEditRow(row) && ro.mutationBlocked()) {
                                        <app-row-action-button action="edit" [label]="editLabel(row.status) + ' (salt okunur)'" [disabled]="true" />
                                    }
                                    @if (canEditRow(row) && !ro.mutationBlocked()) {
                                        <app-row-action-button action="void" (pressed)="openCancel(row)" />
                                    }
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
            }
                </div>
        </div>

        <app-lab-result-cancel-dialog [(visible)]="cancelVisible" [target]="cancelTarget()" (cancelled)="reload()" />
    `
})
export class LabResultsListPageComponent implements OnInit {
    protected readonly scheduleApply = debouncedAction(() => this.applyFilters());
    readonly copy = PANEL_COPY;
    readonly ro = inject(TenantReadOnlyContextService);
    private readonly auth = inject(AuthService);

    private readonly labResultsService = inject(LabResultsService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    readonly contextPetId = signal(readContextFilterParam(this.route, 'petId'));

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
    readonly canUpdateLabResult = this.auth.hasOperationClaim(LAB_RESULTS_UPDATE_CLAIM);
    readonly editLabel = labResultEditLabel;

    /** Detay sayfasındaki Düzenle ve İptal et koşuluyla aynı; salt okunur durumda Düzenle pasif, İptal gizlidir (detaydaki gibi). */
    canEditRow(row: { status: LabResultStatus | null }): boolean {
        return this.canUpdateLabResult && isLabResultEditable(row.status);
    }

    /** İptal diyaloğunun açık olduğu satır. */
    readonly cancelTarget = signal<LabResultListItemVm | null>(null);
    cancelVisible = false;

    openCancel(row: LabResultListItemVm): void {
        this.cancelTarget.set(row);
        this.cancelVisible = true;
    }

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

    clearContextFilter(): void {
        this.contextPetId.set('');
        void this.router.navigate([], { queryParams: CLEAR_CONTEXT_FILTER_QUERY, queryParamsHandling: 'merge', replaceUrl: true });
        this.currentPage.set(1);
        this.first.set(0);
        this.reload();
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
        const key = `${page}|${pageSize}|${search.trim()}|${fromDate.trim()}|${toDate.trim()}|${status}|${this.contextPetId()}`;

        if (!force && key === this.lastLoadKey) {
            return;
        }

        this.lastLoadKey = key;
        this.loading.set(true);
        this.error.set(null);
        this.labResultsService
            .getLabResults({
                petId: this.contextPetId() || undefined,
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
