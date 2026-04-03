import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import type { HospitalizationListItemVm } from '@/app/features/hospitalizations/models/hospitalization-vm.model';
import { HospitalizationsService } from '@/app/features/hospitalizations/services/hospitalizations.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatDateDisplay, formatDateTimeDisplay } from '@/app/shared/utils/date.utils';

type ActiveFilterUi = 'all' | 'active' | 'discharged';

@Component({
    selector: 'app-hospitalizations-list-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        TableModule,
        ButtonModule,
        InputTextModule,
        SelectModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent
    ],
    template: `
        <app-page-header title="Yatışlar" subtitle="Klinik" description="Yatış ve gözlem kayıtları.">
            <a actions routerLink="/panel/hospitalizations/new" pButton type="button" label="Yeni yatış" icon="pi pi-plus" class="p-button-primary"></a>
        </app-page-header>

        <div class="card mb-6">
            <div class="grid grid-cols-12 gap-4 items-end">
                <div class="col-span-12 md:col-span-3">
                    <label for="hospSearch" class="block text-sm font-medium text-muted-color mb-2">Arama</label>
                    <input
                        pInputText
                        id="hospSearch"
                        class="w-full"
                        [(ngModel)]="searchInput"
                        placeholder="Neden, müşteri veya hayvan…"
                        (keyup.enter)="applyFilters()"
                    />
                </div>
                <div class="col-span-12 md:col-span-3">
                    <label for="hospStatus" class="block text-sm font-medium text-muted-color mb-2">Durum</label>
                    <p-select
                        inputId="hospStatus"
                        [(ngModel)]="activeFilterInput"
                        [options]="activeFilterOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Durum"
                        styleClass="w-full"
                    />
                </div>
                <div class="col-span-12 md:col-span-2">
                    <label for="hospFrom" class="block text-sm font-medium text-muted-color mb-2">Başlangıç</label>
                    <input id="hospFrom" type="date" class="w-full p-inputtext p-component" [(ngModel)]="fromDateInput" />
                </div>
                <div class="col-span-12 md:col-span-2">
                    <label for="hospTo" class="block text-sm font-medium text-muted-color mb-2">Bitiş</label>
                    <input id="hospTo" type="date" class="w-full p-inputtext p-component" [(ngModel)]="toDateInput" />
                </div>
                <div class="col-span-12 md:col-span-2 flex flex-wrap gap-2">
                    <p-button [label]="copy.buttonSearch" icon="pi pi-search" (onClick)="applyFilters()" [disabled]="loading()" />
                    <p-button [label]="copy.buttonClear" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
                </div>
            </div>
        </div>

        @if (loading()) {
            <app-loading-state message="Liste yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else {
            <div class="card">
                <h5 class="mb-4">{{ copy.recordsHeading }}</h5>
                @if (displayedRows().length === 0) {
                    <app-empty-state [message]="copy.listEmptyMessage" [hint]="copy.listEmptyHint" />
                } @else {
                    <p-table
                        [value]="displayedRows()"
                        [paginator]="true"
                        [rows]="pageSize()"
                        [totalRecords]="totalItems()"
                        [lazy]="true"
                        [first]="first()"
                        (onLazyLoad)="onTableLazyLoad($event)"
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
                                <th>Hayvan</th>
                                <th>Neden</th>
                                <th style="width: 8rem">İşlemler</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr>
                                <td>{{ formatDateTime(row.admittedAtUtc) }}</td>
                                <td>{{ formatDateTime(row.plannedDischargeAtUtc) }}</td>
                                <td>{{ formatDateTime(row.dischargedAtUtc) }}</td>
                                <td>
                                    @if (row.isActive) {
                                        <span class="font-medium">Aktif</span>
                                    } @else {
                                        Taburcu
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
                                    @if (row.petId) {
                                        <a [routerLink]="['/panel/pets', row.petId]" class="text-primary font-medium no-underline">{{ row.petName }}</a>
                                    } @else {
                                        {{ row.petName }}
                                    }
                                </td>
                                <td>{{ row.reason }}</td>
                                <td>
                                    <a [routerLink]="['/panel/hospitalizations', row.id]" class="text-primary font-medium no-underline">Detay</a>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                }
            </div>
        }
    `
})
export class HospitalizationsListPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly hospitalizationsService = inject(HospitalizationsService);

    readonly activeFilterOptions: { label: string; value: ActiveFilterUi }[] = [
        { label: 'Tümü', value: 'all' },
        { label: 'Aktif', value: 'active' },
        { label: 'Taburcu', value: 'discharged' }
    ];

    activeFilterInput: ActiveFilterUi = 'all';

    readonly loading = signal(false);
    readonly error = signal<string | null>(null);

    readonly rawItems = signal<HospitalizationListItemVm[]>([]);
    readonly totalItems = signal(0);
    readonly pageSize = signal(10);
    readonly first = signal(0);
    readonly currentPage = signal(1);

    readonly activeSearch = signal('');
    readonly activeFromDate = signal('');
    readonly activeToDate = signal('');
    readonly activeFilter = signal<ActiveFilterUi>('all');

    searchInput = '';
    fromDateInput = '';
    toDateInput = '';
    readonly displayedRows = computed(() => this.rawItems());

    readonly formatDate = (v: string | null) => formatDateDisplay(v);
    readonly formatDateTime = (v: string | null) => formatDateTimeDisplay(v);

    private suppressNextLazy = false;
    private lastLoadKey = '';

    ngOnInit(): void {
        this.suppressNextLazy = true;
        this.loadFromServer(1, this.pageSize(), this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.activeFilter());
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
        this.first.set(0);
        this.loadFromServer(1, this.pageSize(), this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.activeFilter());
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
        this.first.set(0);
        this.loadFromServer(1, this.pageSize(), '', '', '', 'all');
    }

    reload(): void {
        this.loadFromServer(
            this.currentPage(),
            this.pageSize(),
            this.activeSearch(),
            this.activeFromDate(),
            this.activeToDate(),
            this.activeFilter(),
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
        this.loadFromServer(page, rows, this.activeSearch(), this.activeFromDate(), this.activeToDate(), this.activeFilter());
    }

    private loadFromServer(
        page: number,
        pageSize: number,
        search: string,
        fromDate: string,
        toDate: string,
        filter: ActiveFilterUi,
        force = false
    ): void {
        const ao = this.activeOnlyFromFilter(filter);
        const key = `${page}|${pageSize}|${search.trim()}|${fromDate.trim()}|${toDate.trim()}|${filter}|${ao ?? 'all'}`;
        if (!force && key === this.lastLoadKey) {
            return;
        }
        this.lastLoadKey = key;
        this.loading.set(true);
        this.error.set(null);
        this.hospitalizationsService
            .getHospitalizations({
                page,
                pageSize,
                search: search || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
                activeOnly: ao
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
