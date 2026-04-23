import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
import { formatDateDisplay } from '@/app/shared/utils/date.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';

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
            @if (!ro.mutationBlocked()) {
                <a actions routerLink="/panel/vaccinations/new" pButton type="button" label="Yeni Aşı" icon="pi pi-plus" class="p-button-primary"></a>
            } @else {
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
                                <div class="flex-1 min-w-0">
                                    <label for="vacSearch" class="block text-xs font-medium text-muted-color mb-1">Arama</label>
                                    <input
                                        pInputText
                                        id="vacSearch"
                                        class="w-full"
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
                            <div class="col-span-12 md:col-span-4">
                                <span id="lblVacStatus" class="block text-xs font-medium text-muted-color mb-1">Durum</span>
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
                            <div class="col-span-12 md:col-span-4">
                                <label for="vacFrom" class="block text-xs font-medium text-muted-color mb-1">Başlangıç</label>
                                <input id="vacFrom" type="date" class="w-full p-inputtext p-component" [(ngModel)]="fromDateInput" />
                            </div>
                            <div class="col-span-12 md:col-span-4">
                                <label for="vacTo" class="block text-xs font-medium text-muted-color mb-1">Bitiş</label>
                                <input id="vacTo" type="date" class="w-full p-inputtext p-component" [(ngModel)]="toDateInput" />
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
                                    <th>Uygulama tarihi</th>
                                    <th>Sonraki tarih</th>
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
                                    <div><span class="font-medium">Sonraki: </span>{{ formatDate(row.dueAtUtc) }}</div>
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
                            [rowsPerPageOptions]="[10, 25, 50]"
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

    private readonly vaccinationsService = inject(VaccinationsService);

    /** İlk yüklemede boş tablo flaşını önlemek için true başlar. */
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);

    readonly rawItems = signal<VaccinationListItemVm[]>([]);
    readonly totalItems = signal(0);
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
        { label: 'Uygulandı', value: '1' },
        { label: 'İptal', value: '2' }
    ];

    readonly displayedRows = computed(() => this.rawItems());

    readonly formatDate = (v: string | null) => formatDateDisplay(v);
    readonly statusLabel = vaccinationStatusLabel;
    readonly statusSeverity = vaccinationStatusSeverity;
    private suppressNextLazy = false;
    private lastLoadKey = '';

    ngOnInit(): void {
        this.suppressNextLazy = true;
        this.loadFromServer(1, this.pageSize(), this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.statusFilter);
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
        const rows = event.rows ?? 10;
        const first = event.first ?? 0;
        const page = Math.floor(first / rows) + 1;
        this.loadFromServer(page, rows, this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.statusFilter);
    }

    onMobilePageChange(state: PaginatorState): void {
        const rows = state.rows ?? this.pageSize();
        const first = state.first ?? 0;
        const page = Math.floor(first / rows) + 1;
        this.suppressNextLazy = true;
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
        const key = `${page}|${pageSize}|${search.trim()}|${fromDate.trim()}|${toDate.trim()}|${status.trim()}`;
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
                status: status || undefined
            })
            .subscribe({
                next: (r) => {
                    this.rawItems.set(r.items);
                    this.totalItems.set(r.totalItems);
                    this.pageSize.set(r.pageSize);
                    this.currentPage.set(r.page);
                    this.first.set((r.page - 1) * r.pageSize);
                    this.loading.set(false);
                },
                error: (e: Error) => {
                    this.error.set(e.message ?? 'Yükleme hatası');
                    this.loading.set(false);
                }
            });
    }
}
