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
import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import { AppointmentsService } from '@/app/features/appointments/services/appointments.service';
import { appointmentStatusLabel, appointmentStatusSeverity } from '@/app/features/appointments/utils/appointment-status.utils';
import { appointmentTypeDisplayLabel } from '@/app/features/appointments/utils/appointment-type.utils';
import { CLEAR_APPOINTMENTS_LIST_LINK_QUERY, readAppointmentsListLinkFilters } from '@/app/features/appointments/utils/appointments-list-link.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatUtcIsoAsLocalDateDisplay, formatUtcIsoAsLocalTimeDisplay } from '@/app/shared/utils/date.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { APPOINTMENTS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';

type AppointmentListState = {
    search: string;
    status: string;
    fromDate: string;
    toDate: string;
    page: number;
    pageSize: number;
};

const APPOINTMENTS_LIST_STATE_KEY = 'panel:appointments:listState';

@Component({
    selector: 'app-appointments-list-page',
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
        AppContextFilterChipComponent, AppErrorStateComponent,
        AppStatusTagComponent, DateInputComponent, FilterFieldComponent,
        SearchInputComponent
    ],
    template: `
        @if (contextPetId() || contextClientId()) {
            <app-context-filter-chip [label]="contextFilterLabel()" (clear)="clearContextFilter()" />
        }

        <div class="card">
                <div class="flex flex-col gap-4">
                    <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                        <app-list-header class="mb-3" title="Randevular" [count]="totalItems()">
                            <app-filter-field label="Arama" labelFor="apptSearch" [active]="isSearchActive()" width="grow">
                                <app-search-input inputId="apptSearch" placeholder="Not; müşteri, hasta, tür veya ırk metni…" [(value)]="searchInput" (searchRequested)="applyFilters()" />
                            </app-filter-field>
                            <p-button actions [label]="copy.buttonClear" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
                            @if (canCreateAppointment && !ro.mutationBlocked()) {
                                <a actions routerLink="/panel/appointments/new" pButton type="button" label="Yeni Randevu" icon="pi pi-plus" class="p-button-primary"></a>
                            } @else if (canCreateAppointment && ro.mutationBlocked()) {
                                <button actions pButton type="button" label="Yeni Randevu (salt okunur)" icon="pi pi-lock" [disabled]="true" class="p-button-secondary"></button>
                            }
                        </app-list-header>
                        <div class="flex flex-wrap items-end gap-3">
                            <app-filter-field label="Durum" labelId="lblApptStatus" [active]="isStatusActive()" width="select">
                                <p-select
                                    ariaLabelledBy="lblApptStatus"
                                    inputId="apptStatus"
                                    [options]="statusOptions"
                                    [(ngModel)]="statusFilter"
                                    optionLabel="label"
                                    optionValue="value"
                                    [placeholder]="copy.filterPlaceholderAll"
                                    styleClass="w-full"
                                    [showClear]="true" (ngModelChange)="scheduleApply()" />
                            </app-filter-field>
                            <app-filter-field label="Başlangıç" labelFor="apptFrom" [active]="isFromDateActive()" width="date">
                                <app-date-input inputId="apptFrom" type="date" min="1900-01-01" [(ngModel)]="fromDateInput" limit="planned" (ngModelChange)="scheduleApply()" />
                            </app-filter-field>
                            <app-filter-field label="Bitiş" labelFor="apptTo" [active]="isToDateActive()" width="date">
                                <app-date-input inputId="apptTo" type="date" min="1900-01-01" [(ngModel)]="toDateInput" limit="planned" (ngModelChange)="scheduleApply()" />
                            </app-filter-field>
                        </div>
                    </div>
            @if (loading()) {
                <app-loading-state message="Randevu listesi yükleniyor…" />
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
                            [tableStyle]="{ 'min-width': '78rem' }"
                            [showCurrentPageReport]="true"
                            currentPageReportTemplate="{first} - {last} / {totalRecords}"
                        >
                            <ng-template #header>
                                <tr>
                                    <th>Tarih · saat</th>
                                    <th>Süre</th>
                                    <th>Müşteri</th>
                                    <th>Hasta</th>
                                    <th>Randevu Türü</th>
                                    <th>Durum</th>
                                    <th>İşlem</th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-row>
                                <tr>
                                    <td>{{ formatListAppointmentSchedule(row) }}</td>
                                    <td class="text-sm whitespace-nowrap">{{ row.durationLabel }}</td>
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
                                    <td>{{ typeDisplay(row.appointmentType, row.appointmentTypeName) }}</td>
                                    <td>
                                        <app-status-tag [label]="statusLabel(row.status)" [severity]="statusSeverity(row.status)" />
                                    </td>
                                    <td>
                                        <a [routerLink]="['/panel/appointments', row.id]" class="text-primary font-medium no-underline">Detay</a>
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
                                <div class="flex flex-wrap items-start justify-between gap-2 gap-y-1 mb-3">
                                    <div class="text-sm font-medium text-surface-900 dark:text-surface-0 min-w-0">
                                        {{ formatListAppointmentSchedule(row) }}
                                        <span class="text-muted-color font-normal"> · {{ row.durationLabel }}</span>
                                    </div>
                                    <app-status-tag [label]="statusLabel(row.status)" [severity]="statusSeverity(row.status)" />
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
                                <div class="text-sm text-muted-color mb-3 min-w-0 break-words">
                                    <span class="font-medium">Tür: </span>{{ typeDisplay(row.appointmentType, row.appointmentTypeName) }}
                                </div>
                                <div class="flex justify-end pt-1 border-t border-surface-200 dark:border-surface-700">
                                    <a [routerLink]="['/panel/appointments', row.id]" class="text-primary font-medium no-underline">Detay →</a>
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
export class AppointmentsListPageComponent implements OnInit {
    protected readonly scheduleApply = debouncedAction(() => this.applyFilters());
    readonly copy = PANEL_COPY;
    readonly ro = inject(TenantReadOnlyContextService);
    private readonly auth = inject(AuthService);

    private readonly appointmentsService = inject(AppointmentsService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    readonly contextPetId = signal(readContextFilterParam(this.route, 'petId'));
    readonly contextClientId = signal(readContextFilterParam(this.route, 'clientId'));
    readonly contextFilterLabel = computed(() => (this.contextPetId() ? 'Seçili hastanın kayıtları gösteriliyor' : 'Seçili müşterinin kayıtları gösteriliyor'));

    /** İlk yüklemede boş tablo flaşını önlemek için true başlar. */
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);

    readonly rawItems = signal<AppointmentListItemVm[]>([]);
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

    readonly statusOptions = [
        { label: 'Tümü', value: '' },
        { label: 'Planlandı', value: '0' },
        { label: 'Tamamlandı', value: '1' },
        { label: 'İptal', value: '2' },
        { label: 'Gelmedi', value: '3' }
    ];

    readonly displayedRows = computed(() => this.rawItems());

    /** Liste satırı: `05.05.2026 · 14:00–14:45` (Europe/Istanbul). */
    readonly formatListAppointmentSchedule = (row: AppointmentListItemVm): string => {
        const date = formatUtcIsoAsLocalDateDisplay(row.scheduledAtUtc);
        const start = formatUtcIsoAsLocalTimeDisplay(row.scheduledAtUtc);
        const end = formatUtcIsoAsLocalTimeDisplay(row.scheduledEndUtc);

        if (!start || start === '—') {
            return date;
        }

        const range = end && end !== '—' && end !== start ? `${start}–${end}` : start;

        return `${date} · ${range}`;
    };
    readonly statusLabel = appointmentStatusLabel;
    readonly statusSeverity = appointmentStatusSeverity;
    readonly typeDisplay = appointmentTypeDisplayLabel;
    readonly canCreateAppointment = this.auth.hasOperationClaim(APPOINTMENTS_CREATE_CLAIM);
    readonly hasActiveFilters = computed(
        () => !!this.activeSearch().trim() || !!this.statusFilter.trim() || !!this.activeFromDate().trim() || !!this.activeToDate().trim()
    );
    private suppressNextLazy = false;
    private lastLoadKey = '';

    ngOnInit(): void {
        const restored = this.restoreStateFromSessionStorage();
        const linked = this.applyLinkFiltersFromQuery();

        if (!restored || linked) {
            this.currentPage.set(1);
            this.first.set(0);
        }

        this.suppressNextLazy = true;
        this.loadFromServer(this.currentPage(), this.pageSize(), this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.statusFilter);
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
        this.first.set(0);
        this.currentPage.set(1);
        this.persistStateToSessionStorage(1, this.pageSize());
        this.loadFromServer(1, this.pageSize(), this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.statusFilter);
    }

    resetFilters(): void {
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
        this.loadFromServer(1, this.pageSize(), '', '', '', '');
    }

    clearContextFilter(): void {
        this.contextPetId.set('');
        this.contextClientId.set('');
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
        const key = `${page}|${pageSize}|${search.trim()}|${fromDate.trim()}|${toDate.trim()}|${status.trim()}|${this.contextPetId()}|${this.contextClientId()}`;

        if (!force && key === this.lastLoadKey) {
            return;
        }

        this.lastLoadKey = key;
        this.loading.set(true);
        this.error.set(null);
        this.appointmentsService
            .getAppointments({
                petId: this.contextPetId() || undefined,
                clientId: this.contextClientId() || undefined,
                page,
                pageSize,
                search: search || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
                status: status || undefined,
                sort: 'scheduledAtUtc',
                order: 'desc'
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

    /**
     * Karttan gelen derin bağlantı (`status`, `fromDate`, `toDate`) oturumdaki süzgeçlerin yerine geçer; böylece liste kartın gösterdiği kümeyle aynıdır.
     * Uygulanınca adres çubuğundan kaldırılır, sonraki süzgeç değişikliklerini ezmesin.
     */
    private applyLinkFiltersFromQuery(): boolean {
        const filters = readAppointmentsListLinkFilters(this.route.snapshot.queryParamMap);

        if (!filters) {
            return false;
        }

        this.searchInput = '';
        this.statusFilter = filters.status;
        this.fromDateInput = filters.fromDate;
        this.toDateInput = filters.toDate;
        this.activeSearch.set('');
        this.activeFromDate.set(filters.fromDate);
        this.activeToDate.set(filters.toDate);
        this.persistStateToSessionStorage(1, this.pageSize());
        void this.router.navigate([], { queryParams: CLEAR_APPOINTMENTS_LIST_LINK_QUERY, queryParamsHandling: 'merge', replaceUrl: true });

        return true;
    }

    private restoreStateFromSessionStorage(): boolean {
        const raw = sessionStorage.getItem(APPOINTMENTS_LIST_STATE_KEY);

        if (!raw) {
            return false;
        }

        try {
            const parsed = JSON.parse(raw) as Partial<AppointmentListState>;
            const page = Number(parsed.page);
            const pageSize = Number(parsed.pageSize);

            if (!Number.isFinite(page) || page < 1 || !Number.isFinite(pageSize) || pageSize < 1) {
                sessionStorage.removeItem(APPOINTMENTS_LIST_STATE_KEY);

                return false;
            }

            this.searchInput = typeof parsed.search === 'string' ? parsed.search : '';
            this.statusFilter = typeof parsed.status === 'string' ? parsed.status : '';
            this.fromDateInput = typeof parsed.fromDate === 'string' ? parsed.fromDate : '';
            this.toDateInput = typeof parsed.toDate === 'string' ? parsed.toDate : '';
            this.activeSearch.set(this.searchInput.trim());
            this.activeFromDate.set(this.fromDateInput.trim());
            this.activeToDate.set(this.toDateInput.trim());
            this.pageSize.set(pageSize);
            this.currentPage.set(page);
            this.first.set((page - 1) * pageSize);

            return true;
        } catch {
            sessionStorage.removeItem(APPOINTMENTS_LIST_STATE_KEY);

            return false;
        }
    }

    private persistStateToSessionStorage(page: number, pageSize: number): void {
        const state: AppointmentListState = {
            search: this.searchInput.trim(),
            status: this.statusFilter.trim(),
            fromDate: this.fromDateInput.trim(),
            toDate: this.toDateInput.trim(),
            page,
            pageSize
        };

        sessionStorage.setItem(APPOINTMENTS_LIST_STATE_KEY, JSON.stringify(state));
    }

    private clearStateFromSessionStorage(): void {
        sessionStorage.removeItem(APPOINTMENTS_LIST_STATE_KEY);
    }
}