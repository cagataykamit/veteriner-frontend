import { debouncedAction } from '@/app/shared/ui/search-input/debounced-action';
import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AppContextFilterChipComponent } from '@/app/shared/ui/context-filter-chip/app-context-filter-chip.component';
import { CLEAR_CONTEXT_FILTER_QUERY, readContextFilterParam } from '@/app/shared/utils/context-filter.utils';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Paginator } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { ListPageState } from '@/app/shared/list/list-page-state';
import type { HospitalizationListItemVm } from '@/app/entities/hospitalization/models/hospitalization-vm.model';
import { HospitalizationsService } from '@/app/entities/hospitalization/services/hospitalizations.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { AuthService } from '@/app/core/auth/auth.service';
import { HOSPITALIZATIONS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

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
        AppContextFilterChipComponent,
        AppErrorStateComponent,
        DateInputComponent,
        FilterFieldComponent,
        SearchInputComponent,
        AppRowActionButtonComponent,
        TrDateTimePipe
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
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
                        <button pButton type="button" actions severity="secondary" (click)="resetFilters()" [disabled]="loading()"><i class="p-button-icon pi pi-times"></i>{{ copy.buttonClear }}</button>
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
                                class="w-full"
                                (ngModelChange)="scheduleApply()"
                            />
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
                                (onLazyLoad)="list.onTableLazyLoad($event)"
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
                                        <th>Konum</th>
                                        <th>Neden</th>
                                        <th style="width: 8rem">İşlemler</th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-row>
                                    <tr>
                                        <td>{{ row.admittedAtUtc | trDateTime }}</td>
                                        <td>{{ row.plannedDischargeAtUtc | trDateTime }}</td>
                                        <td>{{ row.dischargedAtUtc | trDateTime }}</td>
                                        <td>
                                            @if (row.isActive) {
                                                <span class="font-medium">Aktif</span>
                                            } @else {
                                                Taburcu
                                            }
                                        </td>
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
                                        <td>{{ row.locationLabel || '—' }}</td>
                                        <td>{{ row.reason }}</td>
                                        <td>
                                            <div class="flex items-center gap-1">
                                                <app-row-action-button action="detail" [link]="['/panel/hospitalizations', row.id]" />
                                                @if (canUpdateHospitalization && row.isActive) {
                                                    @if (ro.mutationBlocked()) {
                                                        <app-row-action-button action="edit" label="Düzenle (salt okunur)" [disabled]="true" />
                                                    } @else {
                                                        <app-row-action-button action="edit" [link]="['/panel/hospitalizations', row.id, 'edit']" />
                                                    }
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
                                    <div class="text-sm font-medium text-surface-900 dark:text-surface-0 min-w-0 mb-3">Yatış: {{ row.admittedAtUtc | trDateTime }}</div>
                                    <div class="space-y-2 mb-3 min-w-0">
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
                                    @if (row.locationLabel) {
                                        <div class="text-sm text-surface-900 dark:text-surface-0 mb-3 min-w-0 break-words"><span class="text-muted-color font-medium">Konum: </span>{{ row.locationLabel }}</div>
                                    }
                                    <div class="text-sm text-surface-900 dark:text-surface-0 mb-3 min-w-0 break-words"><span class="text-muted-color font-medium">Neden: </span>{{ row.reason }}</div>
                                    <div class="text-sm mb-3">
                                        @if (row.isActive) {
                                            <span class="font-medium text-primary">Aktif</span>
                                        } @else {
                                            <span class="text-muted-color">Taburcu</span>
                                        }
                                    </div>
                                    <div class="flex justify-end items-center gap-1 pt-1 border-t border-surface-200 dark:border-surface-700">
                                        <app-row-action-button action="detail" [link]="['/panel/hospitalizations', row.id]" />
                                        @if (canUpdateHospitalization && row.isActive) {
                                            @if (ro.mutationBlocked()) {
                                                <app-row-action-button action="edit" label="Düzenle (salt okunur)" [disabled]="true" />
                                            } @else {
                                                <app-row-action-button action="edit" [link]="['/panel/hospitalizations', row.id, 'edit']" />
                                            }
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
    `
})
export class HospitalizationsListPageComponent implements OnInit {
    protected readonly scheduleApply = debouncedAction(() => this.applyFilters());
    readonly copy = PANEL_COPY;
    readonly ro = inject(TenantReadOnlyContextService);
    private readonly auth = inject(AuthService);
    /** Detay sayfasıyla aynı: yalnız aktif (taburcu edilmemiş) yatış düzenlenir. */
    readonly canUpdateHospitalization = this.auth.hasOperationClaim(HOSPITALIZATIONS_UPDATE_CLAIM);

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

    readonly list = new ListPageState<HospitalizationListItemVm>({
        fetch: (page, pageSize) => {
            const ao = this.activeOnlyFromFilter(this.activeFilter());

            return this.hospitalizationsService
                .getHospitalizations({
                    petId: this.contextPetId() || undefined,
                    page,
                    pageSize,
                    search: this.activeSearch() || undefined,
                    fromDate: this.activeFromDate() || undefined,
                    toDate: this.activeToDate() || undefined,
                    activeOnly: ao
                });
        },
        loadKey: (page, pageSize) => {
            const ao = this.activeOnlyFromFilter(this.activeFilter());

            return `${page}|${pageSize}|${this.activeSearch().trim()}|${this.activeFromDate().trim()}|${this.activeToDate().trim()}|${this.activeFilter()}|${ao ?? 'all'}|${this.contextPetId()}`;
        },
        persist: {
            key: HOSPITALIZATIONS_LIST_STATE_KEY,
            save: (): Omit<HospitalizationsListState, 'page' | 'pageSize'> => ({
                search: this.searchInput.trim(),
                fromDate: this.fromDateInput.trim(),
                toDate: this.toDateInput.trim(),
                activeFilter: this.activeFilterInput
            }),
            restore: (state) => {
                const parsed = state as Partial<HospitalizationsListState>;

                const activeFilter = parsed.activeFilter === 'active' || parsed.activeFilter === 'discharged' ? parsed.activeFilter : 'all';

                this.searchInput = typeof parsed.search === 'string' ? parsed.search : '';
                this.fromDateInput = typeof parsed.fromDate === 'string' ? parsed.fromDate : '';
                this.toDateInput = typeof parsed.toDate === 'string' ? parsed.toDate : '';
                this.activeFilterInput = activeFilter;
                this.activeSearch.set(this.searchInput.trim());
                this.activeFromDate.set(this.fromDateInput.trim());
                this.activeToDate.set(this.toDateInput.trim());
                this.activeFilter.set(activeFilter);
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
    readonly activeFilter = signal<ActiveFilterUi>('all');

    searchInput = '';
    fromDateInput = '';
    toDateInput = '';
    readonly displayedRows = computed(() => this.rawItems());

    ngOnInit(): void {
        const restored = this.list.restore();

        if (!restored) {
            this.list.goToFirstPage();
        }

        this.list.startInitialLoad();
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
        this.list.loadFirstPage();
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

}
