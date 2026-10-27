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
import { Paginator } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { ListPageState } from '@/app/shared/list/list-page-state';
import type { PrescriptionListItemVm } from '@/app/entities/prescription/models/prescription-vm.model';
import { PrescriptionsService } from '@/app/entities/prescription/services/prescriptions.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AuthService } from '@/app/core/auth/auth.service';
import { PRESCRIPTIONS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';
import { SelectModule } from 'primeng/select';
import { HbsStatusBadgeComponent } from '@/app/entities/hbs/components/hbs-status-badge.component';
import type { HbsEntryStatus } from '@/app/entities/hbs/models/hbs.model';
import { HBS_STATUS_FILTER_OPTIONS, parseHbsStatus } from '@/app/entities/hbs/utils/hbs-status.utils';
import { TrDatePipe, TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

type PrescriptionsListState = {
    search: string;
    fromDate: string;
    toDate: string;
    hbsStatus?: string;
    page: number;
    pageSize: number;
};

const PRESCRIPTIONS_LIST_STATE_KEY = 'panel:prescriptions:listState';

@Component({
    selector: 'app-prescriptions-list-page',
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
        AppContextFilterChipComponent,
        AppErrorStateComponent,
        DateInputComponent,
        FilterFieldComponent,
        SearchInputComponent,
        AppRowActionButtonComponent,
        SelectModule,
        HbsStatusBadgeComponent,
        TrDatePipe,
        TrDateTimePipe
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        @if (contextPetId()) {
            <app-context-filter-chip label="Seçili hastanın kayıtları gösteriliyor" (clear)="clearContextFilter()" />
        }

        <div class="card">
            <div class="flex flex-col gap-4">
                <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                    <app-list-header class="mb-3" title="Reçeteler" [count]="totalItems()">
                        <app-filter-field label="Arama" labelFor="rxSearch" [active]="isSearchActive()" width="grow">
                            <app-search-input inputId="rxSearch" placeholder="Başlık, müşteri veya hasta…" [(value)]="searchInput" (searchRequested)="applyFilters()" />
                        </app-filter-field>
                        <button pButton type="button" actions severity="secondary" (click)="resetFilters()" [disabled]="loading()"><i class="p-button-icon pi pi-times"></i>{{ copy.buttonClear }}</button>
                    </app-list-header>
                    <div class="flex flex-wrap items-end gap-3">
                        <app-filter-field label="Başlangıç" labelFor="rxFrom" [active]="isFromDateActive()" width="date">
                            <app-date-input inputId="rxFrom" type="date" min="1900-01-01" [(ngModel)]="fromDateInput" limit="past" (ngModelChange)="scheduleApply()" />
                        </app-filter-field>
                        <app-filter-field label="Bitiş" labelFor="rxTo" [active]="isToDateActive()" width="date">
                            <app-date-input inputId="rxTo" type="date" min="1900-01-01" [(ngModel)]="toDateInput" limit="past" (ngModelChange)="scheduleApply()" />
                        </app-filter-field>
                        <app-filter-field label="HBS durumu" labelId="rxHbsLabel" [active]="!!activeHbsStatus()" width="select">
                            <p-select
                                ariaLabelledBy="rxHbsLabel"
                                inputId="rxHbs"
                                [options]="hbsOptions"
                                [(ngModel)]="hbsStatusInput"
                                (ngModelChange)="scheduleApply()"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Tümü"
                                [showClear]="true"
                                class="w-full"
                                data-testid="rx-hbs-filter"
                            />
                        </app-filter-field>
                    </div>
                </div>
                @if (loading()) {
                    <app-loading-state message="Reçete listesi yükleniyor…" />
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
                                [tableStyle]="{ 'min-width': '60rem' }"
                                [showCurrentPageReport]="true"
                                currentPageReportTemplate="{first} - {last} / {totalRecords}"
                            >
                                <ng-template #header>
                                    <tr>
                                        <th>Tarih</th>
                                        <th>Müşteri</th>
                                        <th>Hasta</th>
                                        <th>Başlık</th>
                                        <th>Takip</th>
                                        <th>HBS</th>
                                        <th style="width: 8rem">İşlemler</th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-row>
                                    <tr>
                                        <td>{{ row.prescribedAtUtc | trDateTime }}</td>
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
                                        <td>{{ row.title }}</td>
                                        <td>{{ row.followUpDateUtc | trDate }}</td>
                                        <td><app-hbs-status-badge [status]="row.hbsStatus" /></td>
                                        <td>
                                            <div class="flex items-center gap-1">
                                                <app-row-action-button action="detail" [link]="['/panel/prescriptions', row.id]" />
                                                @if (canUpdatePrescription && !ro.mutationBlocked()) {
                                                    <app-row-action-button action="edit" [link]="['/panel/prescriptions', row.id, 'edit']" />
                                                } @else if (canUpdatePrescription && ro.mutationBlocked()) {
                                                    <app-row-action-button action="edit" label="Düzenle (salt okunur)" [disabled]="true" />
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
                                        {{ row.prescribedAtUtc | trDateTime }}
                                    </div>
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
                                    <div class="mb-3 min-w-0">
                                        <div class="text-sm font-medium text-surface-900 dark:text-surface-0 break-words">{{ row.title }}</div>
                                        @if (row.followUpDateUtc) {
                                            <div class="text-xs text-muted-color mt-1 line-clamp-2">Takip: {{ row.followUpDateUtc | trDate }}</div>
                                        }
                                        @if (row.hbsStatus) {
                                            <div class="mt-2"><app-hbs-status-badge [status]="row.hbsStatus" /></div>
                                        }
                                    </div>
                                    <div class="flex justify-end items-center gap-1 pt-1 border-t border-surface-200 dark:border-surface-700">
                                        <app-row-action-button action="detail" [link]="['/panel/prescriptions', row.id]" />
                                        @if (canUpdatePrescription && !ro.mutationBlocked()) {
                                            <app-row-action-button action="edit" [link]="['/panel/prescriptions', row.id, 'edit']" />
                                        } @else if (canUpdatePrescription && ro.mutationBlocked()) {
                                            <app-row-action-button action="edit" label="Düzenle (salt okunur)" [disabled]="true" />
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
export class PrescriptionsListPageComponent implements OnInit {
    protected readonly scheduleApply = debouncedAction(() => this.applyFilters());
    readonly copy = PANEL_COPY;
    readonly ro = inject(TenantReadOnlyContextService);
    private readonly auth = inject(AuthService);
    readonly canUpdatePrescription = this.auth.hasOperationClaim(PRESCRIPTIONS_UPDATE_CLAIM);

    private readonly prescriptionsService = inject(PrescriptionsService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    readonly contextPetId = signal(readContextFilterParam(this.route, 'petId'));

    readonly list = new ListPageState<PrescriptionListItemVm>({
        fetch: (page, pageSize) =>
            this.prescriptionsService
                .getPrescriptions({
                    petId: this.contextPetId() || undefined,
                    page,
                    pageSize,
                    search: this.activeSearch() || undefined,
                    fromDate: this.activeFromDate() || undefined,
                    toDate: this.activeToDate() || undefined,
                    hbsStatus: this.activeHbsStatus() ?? undefined
                }),
        loadKey: (page, pageSize) => `${page}|${pageSize}|${this.activeSearch().trim()}|${this.activeFromDate().trim()}|${this.activeToDate().trim()}|${this.contextPetId()}|${this.activeHbsStatus() ?? ''}`,
        persist: {
            key: PRESCRIPTIONS_LIST_STATE_KEY,
            save: (): Omit<PrescriptionsListState, 'page' | 'pageSize'> => ({
                search: this.searchInput.trim(),
                fromDate: this.fromDateInput.trim(),
                toDate: this.toDateInput.trim(),
                hbsStatus: this.activeHbsStatus() ?? undefined
            }),
            restore: (state) => {
                const parsed = state as Partial<PrescriptionsListState>;

                this.searchInput = typeof parsed.search === 'string' ? parsed.search : '';
                this.fromDateInput = typeof parsed.fromDate === 'string' ? parsed.fromDate : '';
                this.toDateInput = typeof parsed.toDate === 'string' ? parsed.toDate : '';
                this.hbsStatusInput = parseHbsStatus(parsed.hbsStatus);
                this.activeSearch.set(this.searchInput.trim());
                this.activeFromDate.set(this.fromDateInput.trim());
                this.activeToDate.set(this.toDateInput.trim());
                this.activeHbsStatus.set(this.hbsStatusInput);
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
    readonly activeHbsStatus = signal<HbsEntryStatus | null>(null);

    readonly hbsOptions = HBS_STATUS_FILTER_OPTIONS;

    searchInput = '';
    fromDateInput = '';
    toDateInput = '';
    hbsStatusInput: HbsEntryStatus | null = null;
    readonly displayedRows = computed(() => this.rawItems());

    ngOnInit(): void {
        const restored = this.list.restore();

        if (!restored) {
            this.list.goToFirstPage();
        }

        // Bugün "HBS'e girilmedi" bağlantısı: `?hbsStatus=NotEntered` saklı süzgeci ezer.
        const hbsFromLink = parseHbsStatus(this.route.snapshot.queryParamMap.get('hbsStatus'));

        if (hbsFromLink) {
            this.hbsStatusInput = hbsFromLink;
            this.activeHbsStatus.set(hbsFromLink);
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
        this.activeHbsStatus.set(parseHbsStatus(this.hbsStatusInput));
        this.list.loadFirstPage();
    }

    resetFilters(): void {
        this.searchInput = '';
        this.fromDateInput = '';
        this.toDateInput = '';
        this.hbsStatusInput = null;
        this.activeSearch.set('');
        this.activeFromDate.set('');
        this.activeToDate.set('');
        this.activeHbsStatus.set(null);
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

    isFromDateActive(): boolean {
        return !!this.activeFromDate().trim();
    }

    isToDateActive(): boolean {
        return !!this.activeToDate().trim();
    }

}
