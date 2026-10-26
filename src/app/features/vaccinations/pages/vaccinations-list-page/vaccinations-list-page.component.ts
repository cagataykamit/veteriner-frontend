import { debouncedAction } from '@/app/shared/ui/search-input/debounced-action';
import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Paginator } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/types/paginator';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import type { VaccinationListItemVm } from '@/app/features/vaccinations/models/vaccination-vm.model';
import { VaccinationsService } from '@/app/features/vaccinations/services/vaccinations.service';
import { vaccinationStatusLabel, vaccinationStatusSeverity } from '@/app/features/vaccinations/utils/vaccination-status.utils';
import { CLEAR_VACCINATIONS_LIST_LINK_QUERY, readVaccinationsListLinkFilters } from '@/app/features/vaccinations/utils/vaccinations-list-link.utils';
import { canOpenVaccinationEdit } from '@/app/features/vaccinations/utils/vaccination-access.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';
import { HbsStatusBadgeComponent } from '@/app/features/hbs/components/hbs-status-badge.component';
import type { HbsEntryStatus } from '@/app/features/hbs/models/hbs.model';
import { HBS_STATUS_FILTER_OPTIONS, parseHbsStatus } from '@/app/features/hbs/utils/hbs-status.utils';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

type VaccinationsListState = {
    search: string;
    status: string;
    fromDate: string;
    toDate: string;
    page: number;
    pageSize: number;
    overdueOnly?: boolean;
    onlyReceivingCare?: boolean;
    hbsStatus?: string;
};

const VACCINATIONS_LIST_STATE_KEY = 'panel:vaccinations:listState';
const RECEIVING_CARE_ONLY = 'true';

@Component({
    selector: 'app-vaccinations-list-page',
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
        AppErrorStateComponent,
        AppStatusTagComponent,
        DateInputComponent,
        FilterFieldComponent,
        SearchInputComponent,
        AppRowActionButtonComponent,
        HbsStatusBadgeComponent,
        TrDateTimePipe
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <div class="card">
            @if (activeOverdueOnly()) {
                <div class="mb-4 border border-amber-200 dark:border-amber-800 rounded-border p-3 bg-amber-50 dark:bg-amber-950/40" role="status">
                    <p class="m-0 text-sm text-amber-950 dark:text-amber-100">
                        <span class="font-medium">Geciken aşı takipleri</span> gösteriliyor: durum <span class="font-medium">Planlandı</span>, planlanan uygulama günü bugünden önce olan kayıtlar. Tüm listeyi görmek için
                        <span class="font-medium">Temizle</span> kullanın.
                    </p>
                </div>
            }
            <div class="flex flex-col gap-4">
                <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                    <app-list-header class="mb-3" title="Aşılar" [count]="totalItems()">
                        <app-filter-field label="Arama" labelFor="vacSearch" [active]="isSearchActive()" width="grow">
                            <app-search-input inputId="vacSearch" placeholder="Aşı adı, not; müşteri, hasta, tür veya ırk…" [(value)]="searchInput" (searchRequested)="applyFilters()" />
                        </app-filter-field>
                        <p-button actions [label]="copy.buttonClear" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
                    </app-list-header>
                    <div class="flex flex-wrap items-end gap-3">
                        <app-filter-field label="Durum" labelId="lblVacStatus" [active]="isStatusActive()" width="select">
                            <p-select
                                ariaLabelledBy="lblVacStatus"
                                inputId="vacStatus"
                                [options]="statusOptions"
                                [(ngModel)]="statusFilter"
                                optionLabel="label"
                                optionValue="value"
                                [placeholder]="copy.filterPlaceholderAll"
                                class="w-full"
                                [showClear]="true"
                                (ngModelChange)="scheduleApply()"
                            />
                        </app-filter-field>
                        <app-filter-field label="Hasta" labelId="lblVacReceivingCare" [active]="isReceivingCareActive()" width="select">
                            <p-select
                                ariaLabelledBy="lblVacReceivingCare"
                                inputId="vacReceivingCare"
                                [options]="receivingCareOptions"
                                [(ngModel)]="receivingCareFilter"
                                optionLabel="label"
                                optionValue="value"
                                [placeholder]="copy.filterPlaceholderAll"
                                class="w-full"
                                [showClear]="true"
                                (ngModelChange)="scheduleApply()"
                            />
                        </app-filter-field>
                        <app-filter-field label="HBS durumu" labelId="lblVacHbs" [active]="!!hbsStatusFilter" width="select">
                            <p-select
                                ariaLabelledBy="lblVacHbs"
                                inputId="vacHbs"
                                [options]="hbsOptions"
                                [(ngModel)]="hbsStatusFilter"
                                optionLabel="label"
                                optionValue="value"
                                [placeholder]="copy.filterPlaceholderAll"
                                class="w-full"
                                data-testid="vac-hbs-filter"
                                [showClear]="true"
                                (ngModelChange)="scheduleApply()"
                            />
                        </app-filter-field>
                        <app-filter-field label="Başlangıç" labelFor="vacFrom" [active]="isFromDateActive()" width="date">
                            <app-date-input inputId="vacFrom" type="date" min="1900-01-01" [(ngModel)]="fromDateInput" limit="planned" (ngModelChange)="scheduleApply()" />
                        </app-filter-field>
                        <app-filter-field label="Bitiş" labelFor="vacTo" [active]="isToDateActive()" width="date">
                            <app-date-input inputId="vacTo" type="date" min="1900-01-01" [(ngModel)]="toDateInput" limit="planned" (ngModelChange)="scheduleApply()" />
                        </app-filter-field>
                    </div>
                </div>
                @if (loading()) {
                    <app-loading-state message="Aşı listesi yükleniyor…" />
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
                                [tableStyle]="{ 'min-width': '76rem' }"
                                [showCurrentPageReport]="true"
                                currentPageReportTemplate="{first} - {last} / {totalRecords}"
                            >
                                <ng-template #header>
                                    <tr>
                                        <th>Uygulama</th>
                                        <th>Planlanan uygulama</th>
                                        <th>Aşı</th>
                                        <th>Hasta</th>
                                        <th>Müşteri</th>
                                        <th>Durum</th>
                                        <th>HBS</th>
                                        <th style="width: 8rem">İşlemler</th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-row>
                                    <tr>
                                        <td>{{ row.appliedAtUtc | trDateTime }}</td>
                                        <td>{{ row.dueAtUtc | trDateTime }}</td>
                                        <td>
                                            {{ row.vaccineName }}
                                            @if (row.administrationId) {
                                                <div class="text-xs text-muted-color" data-testid="stock-linked">Stoktan düştü</div>
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
                                            @if (row.clientId) {
                                                <a [routerLink]="['/panel/clients', row.clientId]" class="text-primary font-medium no-underline">{{ row.clientName }}</a>
                                            } @else {
                                                {{ row.clientName }}
                                            }
                                        </td>
                                        <td>
                                            <app-status-tag [label]="statusLabel(row.status)" [severity]="statusSeverity(row.status)" />
                                        </td>
                                        <td><app-hbs-status-badge [status]="row.hbsStatus" /></td>
                                        <td>
                                            <div class="flex items-center gap-1">
                                                <app-row-action-button action="detail" [link]="['/panel/vaccinations', row.id]" />
                                                @if (canUpdateVaccination && !ro.mutationBlocked()) {
                                                    <app-row-action-button action="edit" [link]="['/panel/vaccinations', row.id, 'edit']" />
                                                } @else if (canUpdateVaccination && ro.mutationBlocked()) {
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
                                    <div class="text-sm text-muted-color mb-3 min-w-0 space-y-1">
                                        <div><span class="font-medium">Uygulama: </span>{{ row.appliedAtUtc | trDateTime }}</div>
                                        <div><span class="font-medium">Planlanan uygulama: </span>{{ row.dueAtUtc | trDateTime }}</div>
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
                                    <div class="text-sm font-medium text-surface-900 dark:text-surface-0 mb-2 min-w-0 break-words">
                                        {{ row.vaccineName }}
                                        @if (row.administrationId) {
                                            <span class="text-xs text-muted-color font-normal"> · Stoktan düştü</span>
                                        }
                                    </div>
                                    <div class="mb-3 flex flex-wrap gap-2">
                                        <app-status-tag [label]="statusLabel(row.status)" [severity]="statusSeverity(row.status)" />
                                        <app-hbs-status-badge [status]="row.hbsStatus" />
                                    </div>
                                    <div class="flex justify-end items-center gap-1 pt-1 border-t border-surface-200 dark:border-surface-700">
                                        <app-row-action-button action="detail" [link]="['/panel/vaccinations', row.id]" />
                                        @if (canUpdateVaccination && !ro.mutationBlocked()) {
                                            <app-row-action-button action="edit" [link]="['/panel/vaccinations', row.id, 'edit']" />
                                        } @else if (canUpdateVaccination && ro.mutationBlocked()) {
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
                                (onPageChange)="onMobilePageChange($event)"
                            />
                        </div>
                    }
                }
            </div>
        </div>
    `
})
export class VaccinationsListPageComponent implements OnInit {
    protected readonly scheduleApply = debouncedAction(() => this.applyFilters());
    readonly copy = PANEL_COPY;
    readonly ro = inject(TenantReadOnlyContextService);
    private readonly auth = inject(AuthService);
    /** Düzenleme rotasının yetki koşuluyla aynı (aşı kataloğu okuma dahil). */
    readonly canUpdateVaccination = canOpenVaccinationEdit((c) => this.auth.hasOperationClaim(c));
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    private readonly vaccinationsService = inject(VaccinationsService);

    /** İlk yüklemede boş tablo flaşını önlemek için true başlar. */
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);

    readonly rawItems = signal<VaccinationListItemVm[]>([]);
    readonly totalItems = signal(0);
    readonly rowsPerPageOptions = [10, 20, 25, 50];
    readonly pageSize = signal(10);
    readonly first = signal(0);
    readonly currentPage = signal(1);

    readonly activeSearch = signal('');
    readonly activeFromDate = signal('');
    readonly activeToDate = signal('');

    searchInput = '';
    fromDateInput = '';
    toDateInput = '';
    statusFilter = '';
    /** `RECEIVING_CARE_ONLY` → API `onlyReceivingCare` (vefat eden hastaların aşıları dışlanır); boş = tüm hastalar. */
    receivingCareFilter = '';
    /** HBS (ATS) durumu süzgeci; Bugün "HBS'e girilmedi" bağlantısı `?hbsStatus=NotEntered` ile gelir. */
    hbsStatusFilter: HbsEntryStatus | null = null;

    readonly hbsOptions = HBS_STATUS_FILTER_OPTIONS;

    /** Dashboard derin bağlantısı + API `OnlyOverdue`; durum her zaman Planlandı (0) ile birlikte kullanılır. */
    readonly activeOverdueOnly = signal(false);

    readonly statusOptions = [
        { label: 'Tümü', value: '' },
        { label: 'Planlandı', value: '0' },
        { label: 'Uygulandı', value: '1' },
        { label: 'İptal', value: '2' }
    ];

    readonly receivingCareOptions = [
        { label: 'Tümü', value: '' },
        { label: 'Yaşayanlar', value: RECEIVING_CARE_ONLY }
    ];

    readonly displayedRows = computed(() => this.rawItems());

    readonly statusLabel = vaccinationStatusLabel;
    readonly statusSeverity = vaccinationStatusSeverity;
    readonly hasActiveFilters = computed(
        () => this.activeOverdueOnly() || !!this.activeSearch().trim() || !!this.statusFilter.trim() || !!this.receivingCareFilter || !!this.hbsStatusFilter || !!this.activeFromDate().trim() || !!this.activeToDate().trim()
    );
    private suppressNextLazy = false;
    private lastLoadKey = '';

    ngOnInit(): void {
        const overdueFromUrl = this.route.snapshot.queryParamMap.get('overdue')?.toLowerCase() === 'true';

        if (overdueFromUrl) {
            this.clearStateFromSessionStorage();
            this.applyOverdueDashboardDeepLink();
        } else {
            const restored = this.restoreStateFromSessionStorage();
            const linked = this.applyLinkFiltersFromQuery();

            if (!restored || linked) {
                this.currentPage.set(1);
                this.first.set(0);
            }
        }

        const hbsFromLink = parseHbsStatus(this.route.snapshot.queryParamMap.get('hbsStatus'));

        if (hbsFromLink) {
            this.hbsStatusFilter = hbsFromLink;
            this.currentPage.set(1);
            this.first.set(0);
        }

        this.suppressNextLazy = true;
        this.syncVaccinationsListQueryParams();
        this.loadFromServer(this.currentPage(), this.pageSize(), this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.statusFilter);
    }

    /**
     * Karttan gelen derin bağlantı (`status`, `fromDate`, `toDate`, `onlyReceivingCare`) oturumdaki süzgeçlerin yerine geçer;
     * böylece liste kartın gösterdiği kümeyle aynıdır. Adres çubuğundan `syncVaccinationsListQueryParams` kaldırır.
     */
    private applyLinkFiltersFromQuery(): boolean {
        const filters = readVaccinationsListLinkFilters(this.route.snapshot.queryParamMap);

        if (!filters) {
            return false;
        }

        this.activeOverdueOnly.set(false);
        this.searchInput = '';
        this.statusFilter = filters.status;
        this.fromDateInput = filters.fromDate;
        this.toDateInput = filters.toDate;
        this.receivingCareFilter = filters.onlyReceivingCare ? RECEIVING_CARE_ONLY : '';
        this.activeSearch.set('');
        this.activeFromDate.set(filters.fromDate);
        this.activeToDate.set(filters.toDate);
        this.persistStateToSessionStorage(1, this.pageSize());

        return true;
    }

    private applyOverdueDashboardDeepLink(): void {
        this.activeOverdueOnly.set(true);
        this.statusFilter = '0';
        this.receivingCareFilter = '';
        this.searchInput = '';
        this.fromDateInput = '';
        this.toDateInput = '';
        this.activeSearch.set('');
        this.activeFromDate.set('');
        this.activeToDate.set('');
        this.currentPage.set(1);
        this.first.set(0);
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

        if (this.activeOverdueOnly() && this.statusFilter.trim() !== '0') {
            this.activeOverdueOnly.set(false);
        }

        this.first.set(0);
        this.currentPage.set(1);
        this.persistStateToSessionStorage(1, this.pageSize());
        this.syncVaccinationsListQueryParams();
        this.loadFromServer(1, this.pageSize(), this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.statusFilter);
    }

    resetFilters(): void {
        this.activeOverdueOnly.set(false);
        this.searchInput = '';
        this.fromDateInput = '';
        this.toDateInput = '';
        this.activeSearch.set('');
        this.activeFromDate.set('');
        this.activeToDate.set('');
        this.statusFilter = '';
        this.receivingCareFilter = '';
        this.hbsStatusFilter = null;
        this.first.set(0);
        this.currentPage.set(1);
        this.clearStateFromSessionStorage();
        void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
        this.loadFromServer(1, this.pageSize(), '', '', '', '');
    }

    reload(): void {
        this.loadFromServer(this.currentPage(), this.pageSize(), this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.statusFilter, true);
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
            this.loadFromServer(1, rows, this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.statusFilter);

            return;
        }

        const page = Math.floor(eventFirst / rows) + 1;

        this.persistStateToSessionStorage(page, rows);
        this.loadFromServer(page, rows, this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.statusFilter);
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
            this.loadFromServer(1, rows, this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.statusFilter);

            return;
        }

        const page = Math.floor(eventFirst / rows) + 1;

        this.persistStateToSessionStorage(page, rows);
        this.loadFromServer(page, rows, this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.statusFilter);
    }

    private loadFromServer(page: number, pageSize: number, search: string, fromDate: string, toDate: string, status: string, force = false): void {
        const overdue = this.activeOverdueOnly();
        const effectiveStatus = overdue ? '0' : status.trim();
        const onlyReceivingCare = this.receivingCareFilter === RECEIVING_CARE_ONLY;
        const key = `${page}|${pageSize}|${search.trim()}|${fromDate.trim()}|${toDate.trim()}|${effectiveStatus}|${overdue}|${onlyReceivingCare}|${this.hbsStatusFilter ?? ''}`;

        if (!force && key === this.lastLoadKey) {
            return;
        }

        this.lastLoadKey = key;
        this.loading.set(true);
        this.error.set(null);
        this.vaccinationsService
            .getVaccinations({
                page,
                pageSize,
                search: search || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
                status: effectiveStatus || undefined,
                onlyOverdue: overdue ? true : undefined,
                onlyReceivingCare: onlyReceivingCare ? true : undefined,
                hbsStatus: this.hbsStatusFilter ?? undefined
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
        return !!this.statusFilter.trim();
    }

    isReceivingCareActive(): boolean {
        return !!this.receivingCareFilter;
    }

    isFromDateActive(): boolean {
        return !!this.activeFromDate().trim();
    }

    isToDateActive(): boolean {
        return !!this.activeToDate().trim();
    }

    private restoreStateFromSessionStorage(): boolean {
        const raw = sessionStorage.getItem(VACCINATIONS_LIST_STATE_KEY);

        if (!raw) {
            return false;
        }

        try {
            const parsed = JSON.parse(raw) as Partial<VaccinationsListState>;
            const page = Number(parsed.page);
            const pageSize = Number(parsed.pageSize);

            if (!Number.isFinite(page) || page < 1 || !Number.isFinite(pageSize) || pageSize < 1) {
                sessionStorage.removeItem(VACCINATIONS_LIST_STATE_KEY);

                return false;
            }

            this.searchInput = typeof parsed.search === 'string' ? parsed.search : '';
            this.statusFilter = typeof parsed.status === 'string' ? parsed.status : '';
            this.fromDateInput = typeof parsed.fromDate === 'string' ? parsed.fromDate : '';
            this.toDateInput = typeof parsed.toDate === 'string' ? parsed.toDate : '';
            this.receivingCareFilter = parsed.onlyReceivingCare === true ? RECEIVING_CARE_ONLY : '';
            this.hbsStatusFilter = parseHbsStatus(parsed.hbsStatus);
            this.activeSearch.set(this.searchInput.trim());
            this.activeFromDate.set(this.fromDateInput.trim());
            this.activeToDate.set(this.toDateInput.trim());
            this.activeOverdueOnly.set(parsed.overdueOnly === true);
            this.pageSize.set(pageSize);
            this.currentPage.set(page);
            this.first.set((page - 1) * pageSize);

            return true;
        } catch {
            sessionStorage.removeItem(VACCINATIONS_LIST_STATE_KEY);

            return false;
        }
    }

    private persistStateToSessionStorage(page: number, pageSize: number): void {
        const state: VaccinationsListState = {
            search: this.searchInput.trim(),
            status: this.statusFilter.trim(),
            fromDate: this.fromDateInput.trim(),
            toDate: this.toDateInput.trim(),
            page,
            pageSize,
            overdueOnly: this.activeOverdueOnly(),
            onlyReceivingCare: this.receivingCareFilter === RECEIVING_CARE_ONLY,
            hbsStatus: this.hbsStatusFilter ?? undefined
        };

        sessionStorage.setItem(VACCINATIONS_LIST_STATE_KEY, JSON.stringify(state));
    }

    private clearStateFromSessionStorage(): void {
        sessionStorage.removeItem(VACCINATIONS_LIST_STATE_KEY);
    }

    /** URL’yi filtreyle hizala; sayfa yenilemede `?overdue=true` korunur, uygulanmış kart bağlantısı süzgeçleri kaldırılır. */
    private syncVaccinationsListQueryParams(): void {
        const showOverdue = this.activeOverdueOnly() && this.statusFilter.trim() === '0';

        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { ...CLEAR_VACCINATIONS_LIST_LINK_QUERY, hbsStatus: null, overdue: showOverdue ? 'true' : null },
            queryParamsHandling: 'merge',
            replaceUrl: true
        });
    }
}
