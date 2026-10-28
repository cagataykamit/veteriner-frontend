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
import type { ExaminationListItemVm } from '@/app/entities/examination/models/examination-vm.model';
import { ExaminationsService } from '@/app/entities/examination/services/examinations.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { examinationStatusLabel, examinationStatusSeverity, isExaminationEditable } from '@/app/entities/examination/utils/examination-status.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AuthService } from '@/app/core/auth/auth.service';
import { EXAMINATIONS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';
import { TrDatePipe, TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

type ExaminationsListState = {
    search: string;
    fromDate: string;
    toDate: string;
    page: number;
    pageSize: number;
};

const EXAMINATIONS_LIST_STATE_KEY = 'panel:examinations:listState';

@Component({
    selector: 'app-examinations-list-page',
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
        AppStatusTagComponent,
        DateInputComponent,
        FilterFieldComponent,
        SearchInputComponent,
        AppRowActionButtonComponent,
        TrDatePipe,
        TrDateTimePipe
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (contextPetId() || contextClientId()) {
            <app-context-filter-chip [label]="contextFilterLabel()" (clear)="clearContextFilter()" />
        }

        <div class="card">
            <div class="flex flex-col gap-4">
                <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                    <app-list-header class="mb-3" title="Muayeneler" [count]="totalItems()">
                        <app-filter-field label="Arama" labelFor="exSearch" [active]="isSearchActive()" width="grow">
                            <app-search-input inputId="exSearch" placeholder="Sebep, bulgu, değerlendirme, not; müşteri, hasta, tür veya ırk…" [(value)]="searchInput" (searchRequested)="applyFilters()" />
                        </app-filter-field>
                        <button pButton type="button" actions severity="secondary" (click)="resetFilters()" [disabled]="loading()"><i class="p-button-icon pi pi-times"></i>{{ copy.buttonClear }}</button>
                    </app-list-header>
                    <div class="flex flex-wrap items-end gap-3">
                        <app-filter-field label="Başlangıç" labelFor="exFrom" [active]="isFromDateActive()" width="date">
                            <app-date-input inputId="exFrom" type="date" min="1900-01-01" [(ngModel)]="fromDateInput" limit="past" (ngModelChange)="scheduleApply()" />
                        </app-filter-field>
                        <app-filter-field label="Bitiş" labelFor="exTo" [active]="isToDateActive()" width="date">
                            <app-date-input inputId="exTo" type="date" min="1900-01-01" [(ngModel)]="toDateInput" limit="past" (ngModelChange)="scheduleApply()" />
                        </app-filter-field>
                    </div>
                </div>
                @if (loading()) {
                    <app-loading-state message="Muayene listesi yükleniyor…" />
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
                                [tableStyle]="{ 'min-width': '65rem' }"
                                [showCurrentPageReport]="true"
                                currentPageReportTemplate="{first} - {last} / {totalRecords}"
                            >
                                <ng-template #header>
                                    <tr>
                                        <th>Tarih</th>
                                        <th>Müşteri</th>
                                        <th>Hasta</th>
                                        <th>Ziyaret sebebi</th>
                                        <th>Durum</th>
                                        <th style="width: 8rem">İşlemler</th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-row>
                                    <tr>
                                        <td>{{ row.examinedAtUtc | trDate }}</td>
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
                                        <td>{{ row.visitReason }}</td>
                                        <td>
                                            @if (row.status) {
                                                <app-status-tag [label]="statusLabel(row.status)" [severity]="statusSeverity(row.status)" />
                                            }
                                        </td>
                                        <td>
                                            <div class="flex items-center gap-1">
                                                <app-row-action-button action="detail" [link]="['/panel/examinations', row.id]" />
                                                @if (canUpdateExamination && isEditable(row.status)) {
                                                    @if (ro.mutationBlocked()) {
                                                        <app-row-action-button action="edit" label="Düzenle (salt okunur)" [disabled]="true" />
                                                    } @else {
                                                        <app-row-action-button action="edit" [link]="['/panel/examinations', row.id, 'edit']" />
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
                                    <div class="text-sm font-medium text-surface-900 dark:text-surface-0 min-w-0 mb-3">
                                        {{ row.examinedAtUtc | trDateTime }}
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
                                    <div class="text-sm text-muted-color mb-3 min-w-0 break-words">
                                        <span class="font-medium">Ziyaret sebebi: </span>{{ row.visitReason }}
                                        @if (row.status) {
                                            <app-status-tag class="ml-2" [label]="statusLabel(row.status)" [severity]="statusSeverity(row.status)" />
                                        }
                                    </div>
                                    <div class="flex justify-end items-center gap-1 pt-1 border-t border-surface-200 dark:border-surface-700">
                                        <app-row-action-button action="detail" [link]="['/panel/examinations', row.id]" />
                                        @if (canUpdateExamination && isEditable(row.status)) {
                                            @if (ro.mutationBlocked()) {
                                                <app-row-action-button action="edit" label="Düzenle (salt okunur)" [disabled]="true" />
                                            } @else {
                                                <app-row-action-button action="edit" [link]="['/panel/examinations', row.id, 'edit']" />
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
export class ExaminationsListPageComponent implements OnInit {
    protected readonly scheduleApply = debouncedAction(() => this.applyFilters());
    readonly copy = PANEL_COPY;
    readonly ro = inject(TenantReadOnlyContextService);
    private readonly auth = inject(AuthService);
    readonly canUpdateExamination = this.auth.hasOperationClaim(EXAMINATIONS_UPDATE_CLAIM);
    readonly isEditable = isExaminationEditable;

    private readonly examinationsService = inject(ExaminationsService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    readonly contextPetId = signal(readContextFilterParam(this.route, 'petId'));
    readonly contextClientId = signal(readContextFilterParam(this.route, 'clientId'));
    readonly contextFilterLabel = computed(() => (this.contextPetId() ? 'Seçili hastanın kayıtları gösteriliyor' : 'Seçili müşterinin kayıtları gösteriliyor'));

    readonly list = new ListPageState<ExaminationListItemVm>({
        fetch: (page, pageSize) =>
            this.examinationsService
                .getExaminations({
                    petId: this.contextPetId() || undefined,
                    clientId: this.contextClientId() || undefined,
                    page,
                    pageSize,
                    search: this.activeSearch() || undefined,
                    fromDate: this.activeFromDate() || undefined,
                    toDate: this.activeToDate() || undefined
                }),
        loadKey: (page, pageSize) => `${page}|${pageSize}|${this.activeSearch().trim()}|${this.activeFromDate().trim()}|${this.activeToDate().trim()}|${this.contextPetId()}|${this.contextClientId()}`,
        persist: {
            key: EXAMINATIONS_LIST_STATE_KEY,
            save: (): Omit<ExaminationsListState, 'page' | 'pageSize'> => ({
                search: this.searchInput.trim(),
                fromDate: this.fromDateInput.trim(),
                toDate: this.toDateInput.trim()
            }),
            restore: (state) => {
                const parsed = state as Partial<ExaminationsListState>;

                this.searchInput = typeof parsed.search === 'string' ? parsed.search : '';
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
    readonly displayedRows = computed(() => this.rawItems());

    readonly statusLabel = examinationStatusLabel;
    readonly statusSeverity = examinationStatusSeverity;
    readonly hasActiveFilters = computed(() => !!this.activeSearch().trim() || !!this.activeFromDate().trim() || !!this.activeToDate().trim());

    ngOnInit(): void {
        const restored = this.list.restore();

        if (!restored) {
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
