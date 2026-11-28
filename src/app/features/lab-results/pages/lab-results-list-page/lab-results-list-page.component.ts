import { debouncedAction } from '@/app/shared/ui/search-input/debounced-action';
import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AppContextFilterChipComponent } from '@/app/shared/ui/context-filter-chip/app-context-filter-chip.component';
import { CLEAR_CONTEXT_FILTER_QUERY, readContextFilterParam } from '@/app/shared/utils/context-filter.utils';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Paginator } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { ListPageState } from '@/app/shared/list/list-page-state';
import type { LabResultListItemVm, LabResultStatus } from '@/app/entities/lab-result/models/lab-result-vm.model';
import { LabResultStatusBadgesComponent } from '@/app/features/lab-results/components/lab-result-status-badges.component';
import { LabResultCancelDialogComponent } from '@/app/features/lab-results/components/lab-result-cancel-dialog.component';
import { isLabResultEditable, LAB_RESULT_STATUS_FILTER_OPTIONS, labResultEditLabel } from '@/app/entities/lab-result/utils/lab-result-status.utils';
import { SelectModule } from 'primeng/select';
import { LabResultsService } from '@/app/entities/lab-result/services/lab-results.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppListEmptyStateComponent } from '@/app/shared/ui/empty-state/app-list-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { AppListFiltersComponent } from '@/app/shared/ui/list-filters/app-list-filters.component';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { LAB_RESULTS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

type LabResultsListState = {
    search: string;
    fromDate: string;
    toDate: string;
    status: string;
    page: number;
    pageSize: number;
};

const LAB_RESULTS_LIST_STATE_KEY = 'panel:lab-results:listState';

const parseLabResultStatusFilter = (raw: unknown): LabResultStatus | '' =>
    LAB_RESULT_STATUS_FILTER_OPTIONS.find((o) => o.value === raw)?.value ?? '';

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
        AppListFiltersComponent,
        FilterFieldComponent,
        AppLoadingStateComponent,
        AppListEmptyStateComponent,
        AppContextFilterChipComponent,
        AppErrorStateComponent,
        DateInputComponent,
        SearchInputComponent,
        SelectModule,
        LabResultStatusBadgesComponent,
        AppRowActionButtonComponent,
        LabResultCancelDialogComponent,
        TrDateTimePipe
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (contextPetId()) {
            <app-context-filter-chip label="Seçili hastanın kayıtları gösteriliyor" (clear)="clearContextFilter()" />
        }

        <div class="card">
            <div class="flex flex-col gap-4">
                <div class="pb-3 border-b border-surface-200 dark:border-surface-700">
                    <app-list-header title="Lab sonuçları" [count]="totalItems()">
                        <app-filter-field label="Arama" labelFor="lrSearch" [active]="!!searchInput.trim()" width="grow">
                            <app-search-input inputId="lrSearch" hint="Test adı, müşteri veya hasta" [(value)]="searchInput" (searchRequested)="applyFilters()" />
                        </app-filter-field>
                        <app-list-filters (clear)="resetFilters()">
                            <app-filter-field label="İstem tarihi (başlangıç)" labelFor="lrFrom" [active]="!!fromDateInput" width="date">
                                <app-date-input inputId="lrFrom" type="date" min="1900-01-01" [(ngModel)]="fromDateInput" limit="past" (ngModelChange)="scheduleApply()" />
                            </app-filter-field>
                            <app-filter-field label="İstem tarihi (bitiş)" labelFor="lrTo" [active]="!!toDateInput" width="date">
                                <app-date-input inputId="lrTo" type="date" min="1900-01-01" [(ngModel)]="toDateInput" limit="past" (ngModelChange)="scheduleApply()" />
                            </app-filter-field>
                            <app-filter-field label="Durum" labelFor="lrStatus" [active]="!!statusInput" width="select">
                                <p-select inputId="lrStatus" [options]="statusOptions" optionLabel="label" optionValue="value" [(ngModel)]="statusInput" (ngModelChange)="applyFilters()" class="w-full" />
                            </app-filter-field>
                        </app-list-filters>
                    </app-list-header>
                </div>
                @if (loading()) {
                    <app-loading-state message="Liste yükleniyor…" />
                } @else if (error()) {
                    <app-error-state [detail]="error()!" (retry)="reload()" />
                } @else {
                    @if (displayedRows().length === 0) {
                        <app-list-empty-state [filtered]="hasActiveFilters()" emptyMessage="Henüz laboratuvar sonucu yok." emptyHint="Laboratuvar istemleri muayene içinden eklenir." (clear)="resetFilters()" />
                    } @else {
                        <div class="hidden lg:block list-table">
                            <p-table
                                [value]="displayedRows()"
                                [paginator]="true"
                                [rows]="pageSize()"
                                [rowsPerPageOptions]="rowsPerPageOptions"
                                [paginatorDropdownAppendTo]="'body'"
                                [totalRecords]="totalItems()"
                                [lazy]="true"
                                [first]="first()"
                                (onLazyLoad)="list.onTableLazyLoad($event)"
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
                                        <td data-testid="lr-requested-at">{{ row.requestedAtUtc | trDateTime }}</td>
                                        <td data-testid="lr-result-date">{{ row.resultDateUtc | trDateTime }}</td>
                                        <td><app-lab-result-status-badges [status]="row.status" [awaitingInterpretation]="row.awaitingInterpretation" /></td>
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
                                        <td>{{ row.testName }}</td>
                                        <td>
                                            <div class="flex items-center gap-1">
                                                <app-row-action-button action="detail" [link]="['/panel/lab-results', row.id]" />
                                                @if (canInterpretRow(row)) {
                                                    <app-row-action-button action="interpret" [link]="['/panel/lab-results', row.id, 'edit']" [queryParams]="interpretQuery" testId="lr-interpret" />
                                                }
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
                                <div class="rounded-border border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4 shadow-sm">
                                    <div class="text-sm font-medium text-surface-900 dark:text-surface-0 min-w-0 mb-3">
                                        <span class="text-muted-color">İstem: </span>{{ row.requestedAtUtc | trDateTime }}
                                        <app-lab-result-status-badges class="ml-2" [status]="row.status" [awaitingInterpretation]="row.awaitingInterpretation" />
                                    </div>
                                    <div class="space-y-2 mb-3 min-w-0">
                                        <div class="text-sm"><span class="text-muted-color font-medium">Sonuç tarihi: </span>{{ row.resultDateUtc | trDateTime }}</div>
                                        <div class="text-sm">
                                            <span class="text-muted-color font-medium">Müşteri: </span>
                                            @if (row.clientId) {
                                                <a [routerLink]="['/panel/clients', row.clientId]" class="text-primary font-medium no-underline break-words">{{ row.clientName }}</a>
                                            } @else {
                                                <span class="break-words">{{ row.clientName }}</span>
                                            }
                                        </div>
                                        <div class="text-sm">
                                            <span class="text-muted-color font-medium">Hasta: </span>
                                            @if (row.petId) {
                                                <a [routerLink]="['/panel/pets', row.petId]" class="text-primary font-medium no-underline break-words">{{ row.petName }}</a>
                                            } @else {
                                                <span class="break-words">{{ row.petName }}</span>
                                            }
                                        </div>
                                    </div>
                                    <div class="text-sm font-medium text-surface-900 dark:text-surface-0 mb-3 min-w-0 break-words">{{ row.testName }}</div>
                                    <div class="flex justify-end items-center gap-1 pt-1 border-t border-surface-200 dark:border-surface-700">
                                        <app-row-action-button action="detail" [link]="['/panel/lab-results', row.id]" />
                                        @if (canInterpretRow(row)) {
                                            <app-row-action-button action="interpret" [link]="['/panel/lab-results', row.id, 'edit']" [queryParams]="interpretQuery" />
                                        }
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
                                (onPageChange)="list.onMobilePageChange($event)"
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

    readonly list = new ListPageState<LabResultListItemVm>({
        fetch: (page, pageSize) =>
            this.labResultsService
                .getLabResults({
                    petId: this.contextPetId() || undefined,
                    page,
                    pageSize,
                    search: this.activeSearch() || undefined,
                    fromDate: this.activeFromDate() || undefined,
                    toDate: this.activeToDate() || undefined,
                    status: this.activeStatus() || undefined
                }),
        loadKey: (page, pageSize) => `${page}|${pageSize}|${this.activeSearch().trim()}|${this.activeFromDate().trim()}|${this.activeToDate().trim()}|${this.activeStatus()}|${this.contextPetId()}`,
        persist: {
            key: LAB_RESULTS_LIST_STATE_KEY,
            save: (): Omit<LabResultsListState, 'page' | 'pageSize'> => ({
                search: this.searchInput.trim(),
                fromDate: this.fromDateInput.trim(),
                toDate: this.toDateInput.trim(),
                status: this.activeStatus()
            }),
            restore: (state) => {
                const parsed = state as Partial<LabResultsListState>;

                this.searchInput = typeof parsed.search === 'string' ? parsed.search : '';
                this.fromDateInput = typeof parsed.fromDate === 'string' ? parsed.fromDate : '';
                this.toDateInput = typeof parsed.toDate === 'string' ? parsed.toDate : '';
                this.statusInput = parseLabResultStatusFilter(parsed.status);
                this.activeSearch.set(this.searchInput.trim());
                this.activeFromDate.set(this.fromDateInput.trim());
                this.activeToDate.set(this.toDateInput.trim());
                this.activeStatus.set(this.statusInput);
            }
        }
    });

    readonly loading = this.list.loading;
    readonly error = this.list.error;

    readonly rawItems = this.list.items;
    readonly totalItems = this.list.totalItems;
    readonly rowsPerPageOptions = this.list.rowsPerPageOptions;
    readonly pageSize = this.list.pageSize;
    readonly first = this.list.first;
    readonly currentPage = this.list.currentPage;

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

    /** Değerlendirme bekleyen sonuçta satırdan doğrudan yorum yazılır; düzenleme formu yorum alanında açılır (detaydaki düğmeyle aynı). */
    readonly interpretQuery = { odak: 'yorum' };

    canInterpretRow(row: { status: LabResultStatus | null; awaitingInterpretation: boolean }): boolean {
        return row.awaitingInterpretation && this.canEditRow(row) && !this.ro.mutationBlocked();
    }

    /** İptal diyaloğunun açık olduğu satır. */
    readonly cancelTarget = signal<LabResultListItemVm | null>(null);
    cancelVisible = false;

    openCancel(row: LabResultListItemVm): void {
        this.cancelTarget.set(row);
        this.cancelVisible = true;
    }

    ngOnInit(): void {
        if (!this.list.restore()) {
            this.list.goToFirstPage();
        }

        this.list.startInitialLoad();
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
        this.list.loadFirstPage();
    }

    /** Boş listede "uyan kayıt yok" mu "henüz yok" mu gösterileceği. */
    hasActiveFilters(): boolean {
        return !!(this.activeSearch().trim() || this.activeFromDate() || this.activeToDate() || this.activeStatus());
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
        this.list.resetToFirstPage();
    }

    clearContextFilter(): void {
        this.contextPetId.set('');
        void this.router.navigate([], { queryParams: CLEAR_CONTEXT_FILTER_QUERY, queryParamsHandling: 'merge', replaceUrl: true });
        this.list.goToFirstPage();
        this.reload();
    }

    reload(): void {
        this.list.reload();
    }

}
