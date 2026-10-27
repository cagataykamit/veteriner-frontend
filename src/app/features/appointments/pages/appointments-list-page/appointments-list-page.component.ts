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
import type { AppointmentListItemVm } from '@/app/entities/appointment/models/appointment-vm.model';
import { AppointmentsService } from '@/app/entities/appointment/services/appointments.service';
import { AppointmentCancelDialogComponent } from '@/app/features/appointments/components/appointment-cancel-dialog.component';
import { appointmentStatusLabel, appointmentStatusSeverity, canCancelAppointment } from '@/app/entities/appointment/utils/appointment-status.utils';
import { appointmentTypeDisplayLabel } from '@/app/entities/appointment/utils/appointment-type.utils';
import { CLEAR_APPOINTMENTS_LIST_LINK_QUERY, readAppointmentsListLinkFilters } from '@/app/entities/appointment/utils/appointments-list-link.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatUtcIsoAsLocalDateDisplay, formatUtcIsoAsLocalTimeDisplay } from '@/app/shared/utils/date.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { APPOINTMENTS_CANCEL_CLAIM, APPOINTMENTS_CREATE_CLAIM, APPOINTMENTS_RESCHEDULE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';

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
        AppContextFilterChipComponent,
        AppErrorStateComponent,
        AppStatusTagComponent,
        DateInputComponent,
        FilterFieldComponent,
        SearchInputComponent,
        AppRowActionButtonComponent,
        AppointmentCancelDialogComponent
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
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
                        <button pButton type="button" actions severity="secondary" (click)="resetFilters()" [disabled]="loading()"><i class="p-button-icon pi pi-times"></i>{{ copy.buttonClear }}</button>
                        @if (canCreateAppointment && !ro.mutationBlocked()) {
                            <a actions routerLink="/panel/appointments/new" pButton type="button" class="p-button-primary"><i class="pi pi-plus"></i>Yeni Randevu</a>
                        } @else if (canCreateAppointment && ro.mutationBlocked()) {
                            <button actions pButton type="button" [disabled]="true" class="p-button-secondary"><i class="pi pi-lock"></i>Yeni Randevu (salt okunur)</button>
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
                                class="w-full"
                                [showClear]="true"
                                (ngModelChange)="scheduleApply()"
                            />
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
                                (onLazyLoad)="list.onTableLazyLoad($event)"
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
                                        <th style="width: 8rem">İşlemler</th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-row>
                                    <tr>
                                        <td>{{ formatListAppointmentSchedule(row) }}</td>
                                        <td class="text-sm whitespace-nowrap">{{ row.durationLabel }}</td>
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
                                        <td>{{ typeDisplay(row.appointmentType, row.appointmentTypeName) }}</td>
                                        <td>
                                            <app-status-tag [label]="statusLabel(row.status)" [severity]="statusSeverity(row.status)" />
                                        </td>
                                        <td>
                                            <div class="flex items-center gap-1">
                                                <app-row-action-button action="detail" [link]="['/panel/appointments', row.id]" />
                                                @if (canRescheduleAppointment && !ro.mutationBlocked()) {
                                                    <app-row-action-button action="edit" [link]="['/panel/appointments', row.id, 'edit']" />
                                                } @else if (canRescheduleAppointment && ro.mutationBlocked()) {
                                                    <app-row-action-button action="edit" label="Düzenle (salt okunur)" [disabled]="true" />
                                                }
                                                @if (canCancelAppointment && isCancellable(row.status) && !ro.mutationBlocked()) {
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
                                    <div class="text-sm text-muted-color mb-3 min-w-0 break-words"><span class="font-medium">Tür: </span>{{ typeDisplay(row.appointmentType, row.appointmentTypeName) }}</div>
                                    <div class="flex justify-end items-center gap-1 pt-1 border-t border-surface-200 dark:border-surface-700">
                                        <app-row-action-button action="detail" [link]="['/panel/appointments', row.id]" />
                                        @if (canRescheduleAppointment && !ro.mutationBlocked()) {
                                            <app-row-action-button action="edit" [link]="['/panel/appointments', row.id, 'edit']" />
                                        } @else if (canRescheduleAppointment && ro.mutationBlocked()) {
                                            <app-row-action-button action="edit" label="Düzenle (salt okunur)" [disabled]="true" />
                                        }
                                        @if (canCancelAppointment && isCancellable(row.status) && !ro.mutationBlocked()) {
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

        @if (cancelTarget(); as target) {
            <app-appointment-cancel-dialog [(visible)]="cancelVisible" [target]="target" (cancelled)="reload()" />
        }
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

    readonly list = new ListPageState<AppointmentListItemVm>({
        fetch: (page, pageSize) =>
            this.appointmentsService
                .getAppointments({
                    petId: this.contextPetId() || undefined,
                    clientId: this.contextClientId() || undefined,
                    page,
                    pageSize,
                    search: this.activeSearch() || undefined,
                    fromDate: this.activeFromDate() || undefined,
                    toDate: this.activeToDate() || undefined,
                    status: this.statusFilter || undefined,
                    sort: 'scheduledAtUtc',
                    order: 'desc'
                }),
        loadKey: (page, pageSize) => `${page}|${pageSize}|${this.activeSearch().trim()}|${this.activeFromDate().trim()}|${this.activeToDate().trim()}|${this.statusFilter.trim()}|${this.contextPetId()}|${this.contextClientId()}`,
        persist: {
            key: APPOINTMENTS_LIST_STATE_KEY,
            save: (): Omit<AppointmentListState, 'page' | 'pageSize'> => ({
                search: this.searchInput.trim(),
                status: this.statusFilter.trim(),
                fromDate: this.fromDateInput.trim(),
                toDate: this.toDateInput.trim()
            }),
            restore: (state) => {
                const parsed = state as Partial<AppointmentListState>;

                this.searchInput = typeof parsed.search === 'string' ? parsed.search : '';
                this.statusFilter = typeof parsed.status === 'string' ? parsed.status : '';
                this.fromDateInput = typeof parsed.fromDate === 'string' ? parsed.fromDate : '';
                this.toDateInput = typeof parsed.toDate === 'string' ? parsed.toDate : '';
                this.activeSearch.set(this.searchInput.trim());
                this.activeFromDate.set(this.fromDateInput.trim());
                this.activeToDate.set(this.toDateInput.trim());
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
    readonly canRescheduleAppointment = this.auth.hasOperationClaim(APPOINTMENTS_RESCHEDULE_CLAIM);
    /** İptal simgesi: `Appointments.Cancel`, yalnız Planlandı randevu, salt okunur değil (ADR-026 madde 7). */
    readonly canCancelAppointment = this.auth.hasOperationClaim(APPOINTMENTS_CANCEL_CLAIM);
    readonly isCancellable = canCancelAppointment;
    /** İptal diyaloğunun açık olduğu satır. */
    readonly cancelTarget = signal<AppointmentListItemVm | null>(null);
    readonly cancelVisible = signal(false);
    readonly hasActiveFilters = computed(() => !!this.activeSearch().trim() || !!this.statusFilter.trim() || !!this.activeFromDate().trim() || !!this.activeToDate().trim());

    ngOnInit(): void {
        const restored = this.list.restore();
        const linked = this.applyLinkFiltersFromQuery();

        if (!restored || linked) {
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
        this.list.loadFirstPage();
    }

    resetFilters(): void {
        this.searchInput = '';
        this.fromDateInput = '';
        this.toDateInput = '';
        this.activeSearch.set('');
        this.activeFromDate.set('');
        this.activeToDate.set('');
        this.statusFilter = '';
        this.list.resetToFirstPage();
    }

    clearContextFilter(): void {
        this.contextPetId.set('');
        this.contextClientId.set('');
        void this.router.navigate([], { queryParams: CLEAR_CONTEXT_FILTER_QUERY, queryParamsHandling: 'merge', replaceUrl: true });
        this.list.goToFirstPage();
        this.reload();
    }

    reload(): void {
        this.list.reload();
    }

    openCancel(row: AppointmentListItemVm): void {
        this.cancelTarget.set(row);
        this.cancelVisible.set(true);
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
        this.list.persist(1, this.pageSize());
        void this.router.navigate([], { queryParams: CLEAR_APPOINTMENTS_LIST_LINK_QUERY, queryParamsHandling: 'merge', replaceUrl: true });

        return true;
    }

}
