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
import { TableModule } from 'primeng/table';
import { ListPageState } from '@/app/shared/list/list-page-state';
import type { VaccinationListItemVm } from '@/app/entities/vaccination/models/vaccination-vm.model';
import type { VaccinationsListQuery } from '@/app/entities/vaccination/models/vaccination-query.model';
import { VaccinationsService } from '@/app/entities/vaccination/services/vaccinations.service';
import { parseVaccinationStatusRawToEnum, vaccinationStatusLabel, vaccinationStatusSeverity } from '@/app/entities/vaccination/utils/vaccination-status.utils';
import { CLEAR_VACCINATIONS_LIST_LINK_QUERY, readVaccinationsListLinkFilters } from '@/app/entities/vaccination/utils/vaccinations-list-link.utils';
import { canOpenVaccinationEdit } from '@/app/entities/vaccination/utils/vaccination-access.utils';
import { AppListEmptyStateComponent } from '@/app/shared/ui/empty-state/app-list-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { AppPhoneListComponent, type PhoneListAction, type PhoneListItem } from '@/app/shared/ui/phone-list/app-phone-list.component';
import { AppListFiltersComponent } from '@/app/shared/ui/list-filters/app-list-filters.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';
import { HbsStatusBadgeComponent } from '@/app/entities/hbs/components/hbs-status-badge.component';
import type { HbsEntryStatus } from '@/app/entities/hbs/models/hbs.model';
import { HBS_STATUS_FILTER_OPTIONS, HBS_STATUS_LABEL, parseHbsStatus } from '@/app/entities/hbs/utils/hbs-status.utils';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

/** Oturumda saklanan süzgeçler; sayfa konumunu `ListPageState` ekler. */
type VaccinationsListFilters = {
    search: string;
    status: string;
    fromDate: string;
    toDate: string;
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
        AppPhoneListComponent,
        AppListFiltersComponent,
        AppLoadingStateComponent,
        AppListEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent,
        DateInputComponent,
        FilterFieldComponent,
        SearchInputComponent,
        AppRowActionButtonComponent,
        HbsStatusBadgeComponent,
        TrDateTimePipe
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card">
            @if (activeOverdueOnly()) {
                <div class="mb-4 border border-amber-200 dark:border-amber-800 rounded-border p-3 bg-amber-50 dark:bg-amber-950/40" role="status">
                    <p class="m-0 text-sm text-amber-950 dark:text-amber-100">
                        <span class="font-medium">Geciken aşı takipleri</span> gösteriliyor: son 1 ay içinde vadesi geçmiş planlı aşılar ve uygulanmış aşıların sonraki dozu (aynı aşı daha sonra uygulanmadıysa). Vadesi daha eski kayıtlar burada görünmez, durumuyla listede kalır. Tüm listeyi görmek için
                        <span class="font-medium">Temizle</span> kullanın.
                    </p>
                </div>
            }
            <div class="flex flex-col gap-4">
                <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                    <app-list-header title="Aşılar" [count]="totalItems()">
                        <app-filter-field label="Arama" labelFor="vacSearch" [active]="isSearchActive()" width="grow">
                            <app-search-input inputId="vacSearch" hint="Aşı adı, not; müşteri, hasta, tür veya ırk" [(value)]="searchInput" (searchRequested)="applyFilters()" />
                        </app-filter-field>
                        <app-list-filters (clear)="resetFilters()">
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
                        </app-list-filters>
                    </app-list-header>
                </div>
                @if (loading()) {
                    <app-loading-state message="Aşı listesi yükleniyor…" />
                } @else if (error()) {
                    <app-error-state [detail]="error()!" (retry)="reload()" />
                } @else {
                    @if (displayedRows().length === 0) {
                        <app-list-empty-state [filtered]="hasActiveFilters()" emptyMessage="Henüz aşı kaydı yok." emptyHint="Aşılar muayene sırasında ya da hasta sayfasından eklenir." (clear)="resetFilters()" />
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
                                        <th>Tarih</th>
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
                                        <!-- Uygulandıysa uygulama, değilse planlanan tarih; ayrı "Uygulama" sütunu planlı aşılarda boş kalıyordu. -->
                                        <td class="whitespace-nowrap">
                                            @if (row.appliedAtUtc) {
                                                {{ row.appliedAtUtc | trDateTime }}
                                            } @else {
                                                {{ row.dueAtUtc | trDateTime }}
                                                <div class="text-xs text-muted-color">Planlanan</div>
                                            }
                                            @if (isNextDue(row)) {
                                                <div class="text-xs text-muted-color" data-testid="next-due">Sonraki doz</div>
                                            }
                                        </td>
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

                        <!-- Telefonda ortak gün başlıklı satır listesi (G-04): dokununca dolu alanlar ve yazılı eylemler açılır. -->
                        <app-phone-list class="lg:hidden" [items]="phoneItems()" />

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

    readonly list = new ListPageState<VaccinationListItemVm>({
        fetch: (page, pageSize) => this.vaccinationsService.getVaccinations(this.listQuery(page, pageSize)),
        loadKey: (page, pageSize) => JSON.stringify(this.listQuery(page, pageSize)),
        persist: {
            key: VACCINATIONS_LIST_STATE_KEY,
            save: (): VaccinationsListFilters => ({
                search: this.searchInput.trim(),
                status: this.statusFilter.trim(),
                fromDate: this.fromDateInput.trim(),
                toDate: this.toDateInput.trim(),
                overdueOnly: this.activeOverdueOnly(),
                onlyReceivingCare: this.receivingCareFilter === RECEIVING_CARE_ONLY,
                hbsStatus: this.hbsStatusFilter ?? undefined
            }),
            restore: (state) => {
                const parsed = state as Partial<VaccinationsListFilters>;

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

    /** Telefon satırları (G-04): uygulanan aşıda uygulama, planlıda planlanan gün başlıkta; boş alan yazılmaz. */
    readonly phoneItems = computed<PhoneListItem[]>(() =>
        this.displayedRows().map((row) => {
            const at = row.appliedAtUtc ?? row.dueAtUtc;
            const actions: PhoneListAction[] = this.canUpdateVaccination && !this.ro.mutationBlocked() ? [{ label: 'Düzenle', icon: 'pi pi-pencil', link: ['/panel/vaccinations', row.id, 'edit'] }] : [];

            return {
                id: row.id,
                at,
                title: row.petName,
                titleNote: row.clientName || null,
                sub: [row.vaccineName, row.administrationId ? 'Stoktan düştü' : null].filter(Boolean).join(' · '),
                status: { label: this.statusLabel(row.status), severity: this.statusSeverity(row.status) },
                fields: [
                    { label: 'Aşı', value: row.vaccineName },
                    { label: 'Müşteri', value: row.clientName },
                    { label: 'Uygulama', value: row.appliedAtUtc ? formatUtcIsoAsLocalDateTimeDisplay(row.appliedAtUtc) : null },
                    { label: this.isNextDue(row) ? 'Sonraki doz' : 'Planlanan', value: row.dueAtUtc ? formatUtcIsoAsLocalDateTimeDisplay(row.dueAtUtc) : null },
                    { label: 'HBS', value: row.hbsStatus ? HBS_STATUS_LABEL[row.hbsStatus] : null }
                ],
                detailLink: ['/panel/vaccinations', row.id],
                actions
            };
        })
    );
    readonly statusLabel = vaccinationStatusLabel;

    /** Uygulanmış aşının vadesi sonraki dozdur (gecikmiş listesinde planlı aşıyla birlikte görünür; kural backend `VaccinationDueRule`). */
    isNextDue(row: { status: number | null; dueAtUtc: string | null }): boolean {
        return parseVaccinationStatusRawToEnum(row.status) === 1 && !!row.dueAtUtc;
    }

    readonly statusSeverity = vaccinationStatusSeverity;

    ngOnInit(): void {
        const overdueFromUrl = this.route.snapshot.queryParamMap.get('overdue')?.toLowerCase() === 'true';

        if (overdueFromUrl) {
            this.list.clearPersisted();
            this.applyOverdueDashboardDeepLink();
        } else {
            const restored = this.list.restore();
            const linked = this.applyLinkFiltersFromQuery();

            if (!restored || linked) {
                this.list.goToFirstPage();
            }
        }

        const hbsFromLink = parseHbsStatus(this.route.snapshot.queryParamMap.get('hbsStatus'));

        if (hbsFromLink) {
            this.hbsStatusFilter = hbsFromLink;
            this.list.goToFirstPage();
        }

        this.syncVaccinationsListQueryParams();
        this.list.startInitialLoad();
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
        this.list.persist(1, this.pageSize());

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

        this.syncVaccinationsListQueryParams();
        this.list.loadFirstPage();
    }

    /** Boş listede "uyan kayıt yok" mu "henüz yok" mu gösterileceği. */
    hasActiveFilters(): boolean {
        return this.isSearchActive() || this.isStatusActive() || this.isReceivingCareActive() || !!this.hbsStatusFilter || this.isFromDateActive() || this.isToDateActive();
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
        void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
        this.list.resetToFirstPage();
    }

    reload(): void {
        this.list.reload();
    }

    /** Gecikmiş derin bağlantısında durum her zaman Planlandı (0). */
    private listQuery(page: number, pageSize: number): VaccinationsListQuery {
        const overdue = this.activeOverdueOnly();
        const effectiveStatus = overdue ? '0' : this.statusFilter.trim();
        const onlyReceivingCare = this.receivingCareFilter === RECEIVING_CARE_ONLY;

        return {
            page,
            pageSize,
            search: this.activeSearch() || undefined,
            fromDate: this.activeFromDate() || undefined,
            toDate: this.activeToDate() || undefined,
            status: effectiveStatus || undefined,
            onlyOverdue: overdue ? true : undefined,
            onlyReceivingCare: onlyReceivingCare ? true : undefined,
            hbsStatus: this.hbsStatusFilter ?? undefined
        };
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
