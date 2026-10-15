import { debouncedAction } from '@/app/shared/ui/search-input/debounced-action';
import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AppContextFilterChipComponent } from '@/app/shared/ui/context-filter-chip/app-context-filter-chip.component';
import { CLEAR_CONTEXT_FILTER_QUERY, readContextFilterParam } from '@/app/shared/utils/context-filter.utils';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Paginator } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/types/paginator';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import type { HospitalizationListItemVm } from '@/app/features/hospitalizations/models/hospitalization-vm.model';
import { HospitalizationsService } from '@/app/features/hospitalizations/services/hospitalizations.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { AuthService } from '@/app/core/auth/auth.service';

type ActiveFilterUi = 'all' | 'active' | 'discharged';
type HospitalizationsListState = {
    search: string;
    fromDate: string;
    toDate: string;
    activeFilter: ActiveFilterUi;
    page: number;
    pageSize: number;
};

const HOSPITALIZATIONS_LIST_STATE_KEY = 'panel:hospitalizations:listState';

@Component({
    selector: 'app-hospitalizations-list-page',
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
        AppListHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppContextFilterChipComponent, AppErrorStateComponent, DateInputComponent, FilterFieldComponent,
        SearchInputComponent
    ],
    template: `
        @if (contextPetId()) {
            <app-context-filter-chip label="Seçili hastanın kayıtları gösteriliyor" (clear)="clearContextFilter()" />
        }

        <div class="card">
                <div class="flex flex-col gap-4">
                    <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                        <app-list-header class="mb-3" title="Yatışlar" [count]="totalItems()">
                            <app-filter-field label="Arama" labelFor="hospSearch" [active]="isSearchActive()" width="grow">
                                <app-search-input inputId="hospSearch" placeholder="Neden, müşteri veya hasta…" [(value)]="searchInput" (searchRequested)="applyFilters()" />
                            </app-filter-field>
                            <p-button actions [label]="copy.buttonClear" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
                        </app-list-header>
                        <div class="flex flex-wrap items-end gap-3">
                            <app-filter-field label="Durum" labelId="lblHospStatus" [active]="isStatusActive()" width="select">
                                <p-select
                                    ariaLabelledBy="lblHospStatus"
                                    inputId="hospStatus"
                                    [(ngModel)]="activeFilterInput"
                                    [options]="activeFilterOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Durum"
                                    styleClass="w-full" (ngModelChange)="scheduleApply()" />
                            </app-filter-field>
                            <app-filter-field label="Başlangıç" labelFor="hospFrom" [active]="isFromDateActive()" width="date">
                                <app-date-input inputId="hospFrom" type="date" min="1900-01-01" [(ngModel)]="fromDateInput" limit="past" (ngModelChange)="scheduleApply()" />
                            </app-filter-field>
                            <app-filter-field label="Bitiş" labelFor="hospTo" [active]="isToDateActive()" width="date">
                                <app-date-input inputId="hospTo" type="date" min="1900-01-01" [(ngModel)]="toDateInput" limit="past" (ngModelChange)="scheduleApply()" />
                            </app-filter-field>
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
                            [tableStyle]="{ 'min-width': '70rem' }"
                            [showCurrentPageReport]="true"
                            currentPageReportTemplate="{first} - {last} / {totalRecords}"
                        >
                            <ng-template #header>
                                <tr>
                                    <th>Yatış</th>
                                    <th>Planlı çıkış</th>
                                    <th>Taburcu</th>
                                    <th>Durum</th>
                                    <th>Müşteri</th>
                                    <th>Hasta</th>
                                    <th>Neden</th>
                                    <th style="width: 8rem">İşlemler</th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-row>
                                <tr>
                                    <td>{{ formatDateTime(row.admittedAtUtc) }}</td>
                                    <td>{{ formatDateTime(row.plannedDischargeAtUtc) }}</td>
                                    <td>{{ formatDateTime(row.dischargedAtUtc) }}</td>
                                    <td>
                                        @if (row.isActive) {
                                            <span class="font-medium">Aktif</span>
                                        } @else {
                                            Taburcu
                                        }
                                    </td>
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
                                    <td>{{ row.reason }}</td>
                                    <td>
                                        <a [routerLink]="['/panel/hospitalizations', row.id]" class="text-primary font-medium no-underline">Detay</a>
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
                                    Yatış: {{ formatDateTime(row.admittedAtUtc) }}
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
                                <div class="text-sm text-surface-900 dark:text-surface-0 mb-3 min-w-0 break-words">
                                    <span class="text-muted-color font-medium">Neden: </span>{{ row.reason }}
                                </div>
                                <div class="text-sm mb-3">
                                    @if (row.isActive) {
                                        <span class="font-medium text-primary">Aktif</span>
                                    } @else {
                                        <span class="text-muted-color">Taburcu</span>
                                    }
                                </div>
                                <div class="flex justify-end pt-1 border-t border-surface-200 dark:border-surface-700">
                                    <a [routerLink]="['/panel/hospitalizations', row.id]" class="text-primary font-medium no-underline">Detay →</a>
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
    `
})
export class HospitalizationsListPageComponent implements OnInit {
    protected readonly scheduleApply = debouncedAction(() => this.applyFilters());
    readonly copy = PANEL_COPY;
    private readonly auth = inject(AuthService);

    private readonly hospitalizationsService = inject(HospitalizationsService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    readonly contextPetId = signal(readContextFilterParam(this.route, 'petId'));

    readonly activeFilterOptions: { label: string; value: ActiveFilterUi }[] = [
        { label: 'Tümü', value: 'all' },
        { label: 'Aktif', value: 'active' },
        { label: 'Taburcu', value: 'discharged' }
    ];

    activeFilterInput: ActiveFilterUi = 'all';

    readonly loading = signal(false);
    readonly error = signal<string | null>(null);

    readonly rawItems = signal<HospitalizationListItemVm[]>([]);
    readonly totalItems = signal(0);
    readonly rowsPerPageOptions = [10, 20, 25, 50];
    readonly pageSize = signal(10);
    readonly first = signal(0);
    readonly currentPage = signal(1);

    readonly activeSearch = signal('');
    readonly activeFromDate = signal('');
    readonly activeToDate = signal('');
    readonly activeFilter = signal<ActiveFilterUi>('all');

    searchInput = '';
    fromDateInput = '';
    toDateInput = '';
    readonly displayedRows = computed(() => this.rawItems());

    readonly formatDateTime = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);

    private suppressNextLazy = false;
    private lastLoadKey = '';

    ngOnInit(): void {
        const restored = this.restoreStateFromSessionStorage();

        if (!restored) {
            this.currentPage.set(1);
            this.first.set(0);
        }

        this.suppressNextLazy = true;
        this.loadFromServer(
            this.currentPage(),
            this.pageSize(),
            this.activeSearch(),
            this.activeFromDate(),
            this.activeToDate(),
            this.activeFilter()
        );
    }

    private activeOnlyFromFilter(f: ActiveFilterUi): boolean | undefined {
        if (f === 'active') {
            return true;
        }

        if (f === 'discharged') {
            return false;
        }

        return undefined;
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
        this.activeFilter.set(this.activeFilterInput);
        this.first.set(0);
        this.currentPage.set(1);
        this.persistStateToSessionStorage(1, this.pageSize());
        this.loadFromServer(1, this.pageSize(), this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.activeFilter());
    }

    resetFilters(): void {
        this.searchInput = '';
        this.fromDateInput = '';
        this.toDateInput = '';
        this.activeFilterInput = 'all';
        this.activeSearch.set('');
        this.activeFromDate.set('');
        this.activeToDate.set('');
        this.activeFilter.set('all');
        this.first.set(0);
        this.currentPage.set(1);
        this.clearStateFromSessionStorage();
        this.loadFromServer(1, this.pageSize(), '', '', '', 'all');
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
            this.activeFilter(),
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

        this.persistStateToSessionStorage(page, rows);
        this.loadFromServer(page, rows, this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.activeFilter());
    }

    onMobilePageChange(state: PaginatorState): void {
        const rows = state.rows ?? this.pageSize();
        const first = state.first ?? 0;
        const page = Math.floor(first / rows) + 1;

        this.suppressNextLazy = true;
        this.persistStateToSessionStorage(page, rows);
        this.loadFromServer(page, rows, this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.activeFilter());
    }

    private loadFromServer(
        page: number,
        pageSize: number,
        search: string,
        fromDate: string,
        toDate: string,
        filter: ActiveFilterUi,
        force = false
    ): void {
        const ao = this.activeOnlyFromFilter(filter);
        const key = `${page}|${pageSize}|${search.trim()}|${fromDate.trim()}|${toDate.trim()}|${filter}|${ao ?? 'all'}|${this.contextPetId()}`;

        if (!force && key === this.lastLoadKey) {
            return;
        }

        this.lastLoadKey = key;
        this.loading.set(true);
        this.error.set(null);
        this.hospitalizationsService
            .getHospitalizations({
                petId: this.contextPetId() || undefined,
                page,
                pageSize,
                search: search || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
                activeOnly: ao
            })
            .subscribe({
                next: (r) => {
                    this.rawItems.set(r.items);
                    this.totalItems.set(r.totalItems);
                    this.pageSize.set(r.pageSize);
                    this.currentPage.set(r.page);
                    this.first.set((r.page - 1) * r.pageSize);
                    this.persistStateToSessionStorage(r.page, r.pageSize);
                    this.loading.set(false);
                },
                error: (e: Error) => {
                    this.error.set(e.message ?? 'Yükleme hatası');
                    this.loading.set(false);
                }
            });
    }

    isSearchActive(): boolean {
        return !!this.activeSearch().trim();
    }

    isStatusActive(): boolean {
        return this.activeFilter() !== 'all';
    }

    isFromDateActive(): boolean {
        return !!this.activeFromDate().trim();
    }

    isToDateActive(): boolean {
        return !!this.activeToDate().trim();
    }

    private restoreStateFromSessionStorage(): boolean {
        const raw = sessionStorage.getItem(HOSPITALIZATIONS_LIST_STATE_KEY);

        if (!raw) {
            return false;
        }

        try {
            const parsed = JSON.parse(raw) as Partial<HospitalizationsListState>;
            const page = Number(parsed.page);
            const pageSize = Number(parsed.pageSize);

            if (!Number.isFinite(page) || page < 1 || !Number.isFinite(pageSize) || pageSize < 1) {
                sessionStorage.removeItem(HOSPITALIZATIONS_LIST_STATE_KEY);

                return false;
            }

            const activeFilter = parsed.activeFilter === 'active' || parsed.activeFilter === 'discharged' ? parsed.activeFilter : 'all';

            this.searchInput = typeof parsed.search === 'string' ? parsed.search : '';
            this.fromDateInput = typeof parsed.fromDate === 'string' ? parsed.fromDate : '';
            this.toDateInput = typeof parsed.toDate === 'string' ? parsed.toDate : '';
            this.activeFilterInput = activeFilter;
            this.activeSearch.set(this.searchInput.trim());
            this.activeFromDate.set(this.fromDateInput.trim());
            this.activeToDate.set(this.toDateInput.trim());
            this.activeFilter.set(activeFilter);
            this.pageSize.set(pageSize);
            this.currentPage.set(page);
            this.first.set((page - 1) * pageSize);

            return true;
        } catch {
            sessionStorage.removeItem(HOSPITALIZATIONS_LIST_STATE_KEY);

            return false;
        }
    }

    private persistStateToSessionStorage(page: number, pageSize: number): void {
        const state: HospitalizationsListState = {
            search: this.searchInput.trim(),
            fromDate: this.fromDateInput.trim(),
            toDate: this.toDateInput.trim(),
            activeFilter: this.activeFilterInput,
            page,
            pageSize
        };

        sessionStorage.setItem(HOSPITALIZATIONS_LIST_STATE_KEY, JSON.stringify(state));
    }

    private clearStateFromSessionStorage(): void {
        sessionStorage.removeItem(HOSPITALIZATIONS_LIST_STATE_KEY);
    }
}
