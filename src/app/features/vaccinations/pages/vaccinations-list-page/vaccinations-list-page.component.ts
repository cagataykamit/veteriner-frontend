import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { VACCINATIONS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';

type VaccinationsListState = {
    search: string;
    status: string;
    fromDate: string;
    toDate: string;
    page: number;
    pageSize: number;
    overdueOnly?: boolean;
};

const VACCINATIONS_LIST_STATE_KEY = 'panel:vaccinations:listState';

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
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    template: `
        <app-page-header title="Aşılar" subtitle="Klinik" description="Aşı kayıtları ve takip.">
            @if (canCreateVaccination && !ro.mutationBlocked()) {
                <a actions routerLink="/panel/vaccinations/new" pButton type="button" label="Yeni Aşı" icon="pi pi-plus" class="p-button-primary"></a>
            } @else if (canCreateVaccination && ro.mutationBlocked()) {
                <button
                    actions
                    pButton
                    type="button"
                    label="Yeni Aşı (salt okunur)"
                    icon="pi pi-lock"
                    [disabled]="true"
                    class="p-button-secondary"
                ></button>
            }
        </app-page-header>

        <div class="card">
            @if (activeOverdueOnly()) {
                <div
                    class="mb-4 border border-amber-200 dark:border-amber-800 rounded-border p-3 bg-amber-50 dark:bg-amber-950/40"
                    role="status"
                >
                    <p class="m-0 text-sm text-amber-950 dark:text-amber-100">
                        <span class="font-medium">Geciken aşı takipleri</span> gösteriliyor: durum
                        <span class="font-medium">Planlandı</span>, planlanan uygulama zamanı geçmiş kayıtlar. Tüm listeyi görmek için
                        <span class="font-medium">Temizle</span> kullanın.
                    </p>
                </div>
            }
            @if (loading()) {
                <app-loading-state message="Aşı listesi yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else {
                <div class="flex flex-col gap-4">
                    <div class="pb-3 border-b border-surface-200 dark:border-surface-700">
                        <div class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3 mb-3">
                            <div class="min-w-0">
                                <h5 class="m-0">Aşılar</h5>
                                @if (totalItems() > 0) {
                                    <span class="text-sm text-muted-color whitespace-nowrap">{{ totalItems() }} kayıt</span>
                                }
                            </div>
                            <div class="flex flex-col sm:flex-row gap-3 sm:items-end w-full xl:w-auto xl:min-w-[22rem] xl:max-w-2xl">
                                <div
                                    class="flex-1 min-w-0 rounded-lg border p-2 transition-colors"
                                    [ngClass]="
                                        isSearchActive()
                                            ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
                                            : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900'
                                    "
                                >
                                    <label
                                        for="vacSearch"
                                        class="flex items-center gap-2 text-xs font-medium mb-1"
                                        [ngClass]="isSearchActive() ? 'text-primary-800 dark:text-primary-200' : 'text-muted-color'"
                                    >
                                        Arama
                                        @if (isSearchActive()) {
                                            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100">
                                                Aktif
                                            </span>
                                        }
                                    </label>
                                    <input
                                        pInputText
                                        id="vacSearch"
                                        class="w-full"
                                        [ngClass]="isSearchActive() ? 'border-primary-300 dark:border-primary-600 bg-primary-50/30 dark:bg-primary-900/15' : ''"
                                        [(ngModel)]="searchInput"
                                        placeholder="Aşı adı, not; müşteri, hayvan, tür veya ırk…"
                                        (keyup.enter)="applyFilters()"
                                    />
                                </div>
                                <div class="flex flex-wrap gap-2 shrink-0">
                                    <p-button [label]="copy.buttonSearch" icon="pi pi-search" (onClick)="applyFilters()" [disabled]="loading()" />
                                    <p-button [label]="copy.buttonClear" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-12 gap-3 items-end">
                            <div
                                class="col-span-12 md:col-span-4 rounded-lg border p-2 transition-colors"
                                [ngClass]="
                                    isStatusActive()
                                        ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
                                        : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900'
                                "
                            >
                                <span
                                    id="lblVacStatus"
                                    class="flex items-center gap-2 text-xs font-medium mb-1"
                                    [ngClass]="isStatusActive() ? 'text-primary-800 dark:text-primary-200' : 'text-muted-color'"
                                >
                                    Durum
                                    @if (isStatusActive()) {
                                        <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100">
                                            Aktif
                                        </span>
                                    }
                                </span>
                                <p-select
                                    ariaLabelledBy="lblVacStatus"
                                    inputId="vacStatus"
                                    [options]="statusOptions"
                                    [(ngModel)]="statusFilter"
                                    optionLabel="label"
                                    optionValue="value"
                                    [placeholder]="copy.filterPlaceholderAll"
                                    styleClass="w-full"
                                    [showClear]="true"
                                />
                            </div>
                            <div
                                class="col-span-12 md:col-span-4 rounded-lg border p-2 transition-colors"
                                [ngClass]="
                                    isFromDateActive()
                                        ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
                                        : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900'
                                "
                            >
                                <label
                                    for="vacFrom"
                                    class="flex items-center gap-2 text-xs font-medium mb-1"
                                    [ngClass]="isFromDateActive() ? 'text-primary-800 dark:text-primary-200' : 'text-muted-color'"
                                >
                                    Başlangıç
                                    @if (isFromDateActive()) {
                                        <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100">
                                            Aktif
                                        </span>
                                    }
                                </label>
                                <input
                                    id="vacFrom"
                                    type="date"
                                    class="w-full p-inputtext p-component"
                                    [ngClass]="isFromDateActive() ? 'border-primary-300 dark:border-primary-600 bg-primary-50/30 dark:bg-primary-900/15' : ''"
                                    [(ngModel)]="fromDateInput"
                                />
                            </div>
                            <div
                                class="col-span-12 md:col-span-4 rounded-lg border p-2 transition-colors"
                                [ngClass]="
                                    isToDateActive()
                                        ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
                                        : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900'
                                "
                            >
                                <label
                                    for="vacTo"
                                    class="flex items-center gap-2 text-xs font-medium mb-1"
                                    [ngClass]="isToDateActive() ? 'text-primary-800 dark:text-primary-200' : 'text-muted-color'"
                                >
                                    Bitiş
                                    @if (isToDateActive()) {
                                        <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100">
                                            Aktif
                                        </span>
                                    }
                                </label>
                                <input
                                    id="vacTo"
                                    type="date"
                                    class="w-full p-inputtext p-component"
                                    [ngClass]="isToDateActive() ? 'border-primary-300 dark:border-primary-600 bg-primary-50/30 dark:bg-primary-900/15' : ''"
                                    [(ngModel)]="toDateInput"
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
                            [tableStyle]="{ 'min-width': '76rem' }"
                            [showCurrentPageReport]="true"
                            currentPageReportTemplate="{first} - {last} / {totalRecords}"
                        >
                            <ng-template #header>
                                <tr>
                                    <th>Uygulama</th>
                                    <th>Planlanan uygulama</th>
                                    <th>Aşı</th>
                                    <th>Hayvan</th>
                                    <th>Müşteri</th>
                                    <th>Durum</th>
                                    <th>İşlem</th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-row>
                                <tr>
                                    <td>{{ formatDate(row.appliedAtUtc) }}</td>
                                    <td>{{ formatDate(row.dueAtUtc) }}</td>
                                    <td>{{ row.vaccineName }}</td>
                                    <td>
                                        @if (row.petId) {
                                            <a [routerLink]="['/panel/pets', row.petId]" class="text-primary font-medium no-underline">{{ row.petName }}</a>
                                        } @else {
                                            {{ row.petName }}
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
                                        <app-status-tag [label]="statusLabel(row.status)" [severity]="statusSeverity(row.status)" />
                                    </td>
                                    <td>
                                        <a [routerLink]="['/panel/vaccinations', row.id]" class="text-primary font-medium no-underline">Detay</a>
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
                                <div class="text-sm text-muted-color mb-3 min-w-0 space-y-1">
                                    <div><span class="font-medium">Uygulama: </span>{{ formatDate(row.appliedAtUtc) }}</div>
                                    <div><span class="font-medium">Planlanan uygulama: </span>{{ formatDate(row.dueAtUtc) }}</div>
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
                                <div class="text-sm font-medium text-surface-900 dark:text-surface-0 mb-2 min-w-0 break-words">{{ row.vaccineName }}</div>
                                <div class="mb-3">
                                    <app-status-tag [label]="statusLabel(row.status)" [severity]="statusSeverity(row.status)" />
                                </div>
                                <div class="flex justify-end pt-1 border-t border-surface-200 dark:border-surface-700">
                                    <a [routerLink]="['/panel/vaccinations', row.id]" class="text-primary font-medium no-underline">Detay →</a>
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
export class VaccinationsListPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    readonly ro = inject(TenantReadOnlyContextService);
    private readonly auth = inject(AuthService);
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

    /** Dashboard derin bağlantısı + API `OnlyOverdue`; durum her zaman Planlandı (0) ile birlikte kullanılır. */
    readonly activeOverdueOnly = signal(false);

    readonly statusOptions = [
        { label: 'Tümü', value: '' },
        { label: 'Planlandı', value: '0' },
        { label: 'Uygulandı', value: '1' },
        { label: 'İptal', value: '2' }
    ];
    readonly canCreateVaccination = this.auth.hasOperationClaim(VACCINATIONS_CREATE_CLAIM);

    readonly displayedRows = computed(() => this.rawItems());

    readonly formatDate = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly statusLabel = vaccinationStatusLabel;
    readonly statusSeverity = vaccinationStatusSeverity;
    readonly hasActiveFilters = computed(
        () =>
            this.activeOverdueOnly() ||
            !!this.activeSearch().trim() ||
            !!this.statusFilter.trim() ||
            !!this.activeFromDate().trim() ||
            !!this.activeToDate().trim()
    );
    private suppressNextLazy = false;
    private lastLoadKey = '';

    ngOnInit(): void {
        const overdueFromUrl = this.route.snapshot.queryParamMap.get('overdue')?.toLowerCase() === 'true';
        if (overdueFromUrl) {
            this.clearStateFromSessionStorage();
            this.applyOverdueDashboardDeepLink();
        } else if (!this.restoreStateFromSessionStorage()) {
            this.currentPage.set(1);
            this.first.set(0);
        }
        this.suppressNextLazy = true;
        this.syncVaccinationsListQueryParams();
        this.loadFromServer(this.currentPage(), this.pageSize(), this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.statusFilter);
    }

    private applyOverdueDashboardDeepLink(): void {
        this.activeOverdueOnly.set(true);
        this.statusFilter = '0';
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
        this.first.set(0);
        this.currentPage.set(1);
        this.clearStateFromSessionStorage();
        void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
        this.loadFromServer(1, this.pageSize(), '', '', '', '');
    }

    reload(): void {
        this.loadFromServer(
            this.currentPage(),
            this.pageSize(),
            this.activeSearch(),
            this.activeFromDate(),
            this.activeToDate(),
            this.statusFilter,
            true
        );
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

    private loadFromServer(
        page: number,
        pageSize: number,
        search: string,
        fromDate: string,
        toDate: string,
        status: string,
        force = false
    ): void {
        const overdue = this.activeOverdueOnly();
        const effectiveStatus = overdue ? '0' : status.trim();
        const key = `${page}|${pageSize}|${search.trim()}|${fromDate.trim()}|${toDate.trim()}|${effectiveStatus}|${overdue}`;
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
                onlyOverdue: overdue ? true : undefined
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
            overdueOnly: this.activeOverdueOnly()
        };
        sessionStorage.setItem(VACCINATIONS_LIST_STATE_KEY, JSON.stringify(state));
    }

    private clearStateFromSessionStorage(): void {
        sessionStorage.removeItem(VACCINATIONS_LIST_STATE_KEY);
    }

    /** URL’yi filtreyle hizala; sayfa yenilemede `?overdue=true` korunur. */
    private syncVaccinationsListQueryParams(): void {
        const showOverdue = this.activeOverdueOnly() && this.statusFilter.trim() === '0';
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { overdue: showOverdue ? 'true' : null },
            queryParamsHandling: 'merge',
            replaceUrl: true
        });
    }
}
