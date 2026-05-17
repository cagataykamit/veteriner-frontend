import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Paginator } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/types/paginator';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import type { ExaminationListItemVm } from '@/app/features/examinations/models/examination-vm.model';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatDateDisplay, formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { EXAMINATIONS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';

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
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent
    ],
    template: `
        <app-page-header title="Muayeneler" subtitle="Klinik" description="Muayene kayıtları ve takip.">
            @if (canCreateExamination && !ro.mutationBlocked()) {
                <a actions routerLink="/panel/examinations/new" pButton type="button" label="Yeni Muayene" icon="pi pi-plus" class="p-button-primary"></a>
            } @else if (canCreateExamination && ro.mutationBlocked()) {
                <button
                    actions
                    pButton
                    type="button"
                    label="Yeni Muayene (salt okunur)"
                    icon="pi pi-lock"
                    [disabled]="true"
                    class="p-button-secondary"
                ></button>
            }
        </app-page-header>

        <div class="card">
            @if (loading()) {
                <app-loading-state message="Muayene listesi yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else {
                <div class="flex flex-col gap-4">
                    <div class="pb-3 border-b border-surface-200 dark:border-surface-700">
                        <div class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3 mb-3">
                            <div class="min-w-0">
                                <h5 class="m-0">Muayeneler</h5>
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
                                        for="exSearch"
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
                                        id="exSearch"
                                        class="w-full"
                                        [ngClass]="isSearchActive() ? 'border-primary-300 dark:border-primary-600 bg-primary-50/30 dark:bg-primary-900/15' : ''"
                                        [(ngModel)]="searchInput"
                                        placeholder="Sebep, bulgu, değerlendirme, not; müşteri, hayvan, tür veya ırk…"
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
                                class="col-span-12 md:col-span-6 rounded-lg border p-2 transition-colors"
                                [ngClass]="
                                    isFromDateActive()
                                        ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
                                        : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900'
                                "
                            >
                                <label
                                    for="exFrom"
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
                                    id="exFrom"
                                    type="date"
                                    class="w-full p-inputtext p-component"
                                    [ngClass]="isFromDateActive() ? 'border-primary-300 dark:border-primary-600 bg-primary-50/30 dark:bg-primary-900/15' : ''"
                                    [(ngModel)]="fromDateInput"
                                />
                            </div>
                            <div
                                class="col-span-12 md:col-span-6 rounded-lg border p-2 transition-colors"
                                [ngClass]="
                                    isToDateActive()
                                        ? 'border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/25 ring-1 ring-primary-300/40 dark:ring-primary-700/50'
                                        : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900'
                                "
                            >
                                <label
                                    for="exTo"
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
                                    id="exTo"
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
                            [tableStyle]="{ 'min-width': '65rem' }"
                            [showCurrentPageReport]="true"
                            currentPageReportTemplate="{first} - {last} / {totalRecords}"
                        >
                            <ng-template #header>
                                <tr>
                                    <th>Tarih</th>
                                    <th>Müşteri</th>
                                    <th>Hayvan</th>
                                    <th>Ziyaret sebebi</th>
                                    <th style="width: 8rem">İşlemler</th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-row>
                                <tr>
                                    <td>{{ formatDate(row.examinedAtUtc) }}</td>
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
                                    <td>{{ row.visitReason }}</td>
                                    <td>
                                        <a [routerLink]="['/panel/examinations', row.id]" class="text-primary font-medium no-underline">Detay</a>
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
                                    {{ formatDateTime(row.examinedAtUtc) }}
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
                                <div class="text-sm text-muted-color mb-3 min-w-0 break-words">
                                    <span class="font-medium">Ziyaret sebebi: </span>{{ row.visitReason }}
                                </div>
                                <div class="flex justify-end pt-1 border-t border-surface-200 dark:border-surface-700">
                                    <a [routerLink]="['/panel/examinations', row.id]" class="text-primary font-medium no-underline">Detay →</a>
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
export class ExaminationsListPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    readonly ro = inject(TenantReadOnlyContextService);
    private readonly auth = inject(AuthService);

    private readonly examinationsService = inject(ExaminationsService);

    /** İlk yüklemede boş tablo flaşını önlemek için true başlar. */
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);

    readonly rawItems = signal<ExaminationListItemVm[]>([]);
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
    readonly displayedRows = computed(() => this.rawItems());
    readonly canCreateExamination = this.auth.hasOperationClaim(EXAMINATIONS_CREATE_CLAIM);

    readonly formatDate = (v: string | null) => formatDateDisplay(v);
    readonly formatDateTime = (v: string | null) => formatDateTimeDisplay(v);
    readonly hasActiveFilters = computed(
        () => !!this.activeSearch().trim() || !!this.activeFromDate().trim() || !!this.activeToDate().trim()
    );
    private suppressNextLazy = false;
    private lastLoadKey = '';

    ngOnInit(): void {
        const restored = this.restoreStateFromSessionStorage();
        if (!restored) {
            this.currentPage.set(1);
            this.first.set(0);
        }
        this.suppressNextLazy = true;
        this.loadFromServer(this.currentPage(), this.pageSize(), this.activeSearch(), this.activeFromDate(), this.activeToDate());
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
        this.loadFromServer(1, this.pageSize(), this.activeSearch(), this.activeFromDate(), this.activeToDate());
    }

    resetFilters(): void {
        this.searchInput = '';
        this.fromDateInput = '';
        this.toDateInput = '';
        this.activeSearch.set('');
        this.activeFromDate.set('');
        this.activeToDate.set('');
        this.first.set(0);
        this.currentPage.set(1);
        this.clearStateFromSessionStorage();
        this.loadFromServer(1, this.pageSize(), '', '', '');
    }

    reload(): void {
        this.loadFromServer(
            this.currentPage(),
            this.pageSize(),
            this.activeSearch(),
            this.activeFromDate(),
            this.activeToDate(),
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
            this.loadFromServer(1, rows, this.activeSearch(), this.activeFromDate(), this.activeToDate());
            return;
        }

        const page = Math.floor(eventFirst / rows) + 1;
        this.persistStateToSessionStorage(page, rows);
        this.loadFromServer(page, rows, this.activeSearch(), this.activeFromDate(), this.activeToDate());
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
            this.loadFromServer(1, rows, this.activeSearch(), this.activeFromDate(), this.activeToDate());
            return;
        }

        const page = Math.floor(eventFirst / rows) + 1;
        this.persistStateToSessionStorage(page, rows);
        this.loadFromServer(page, rows, this.activeSearch(), this.activeFromDate(), this.activeToDate());
    }

    private loadFromServer(
        page: number,
        pageSize: number,
        search: string,
        fromDate: string,
        toDate: string,
        force = false
    ): void {
        const key = `${page}|${pageSize}|${search.trim()}|${fromDate.trim()}|${toDate.trim()}`;
        if (!force && key === this.lastLoadKey) {
            return;
        }
        this.lastLoadKey = key;
        this.loading.set(true);
        this.error.set(null);
        this.examinationsService
            .getExaminations({
                page,
                pageSize,
                search: search || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined
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

    isFromDateActive(): boolean {
        return !!this.activeFromDate().trim();
    }

    isToDateActive(): boolean {
        return !!this.activeToDate().trim();
    }

    private restoreStateFromSessionStorage(): boolean {
        const raw = sessionStorage.getItem(EXAMINATIONS_LIST_STATE_KEY);
        if (!raw) {
            return false;
        }
        try {
            const parsed = JSON.parse(raw) as Partial<ExaminationsListState>;
            const page = Number(parsed.page);
            const pageSize = Number(parsed.pageSize);
            if (!Number.isFinite(page) || page < 1 || !Number.isFinite(pageSize) || pageSize < 1) {
                sessionStorage.removeItem(EXAMINATIONS_LIST_STATE_KEY);
                return false;
            }
            this.searchInput = typeof parsed.search === 'string' ? parsed.search : '';
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
            sessionStorage.removeItem(EXAMINATIONS_LIST_STATE_KEY);
            return false;
        }
    }

    private persistStateToSessionStorage(page: number, pageSize: number): void {
        const state: ExaminationsListState = {
            search: this.searchInput.trim(),
            fromDate: this.fromDateInput.trim(),
            toDate: this.toDateInput.trim(),
            page,
            pageSize
        };
        sessionStorage.setItem(EXAMINATIONS_LIST_STATE_KEY, JSON.stringify(state));
    }

    private clearStateFromSessionStorage(): void {
        sessionStorage.removeItem(EXAMINATIONS_LIST_STATE_KEY);
    }
}
