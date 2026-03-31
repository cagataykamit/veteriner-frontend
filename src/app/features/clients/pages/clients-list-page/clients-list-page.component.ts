import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import type { ClientListItemVm } from '@/app/features/clients/models/client-vm.model';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatDateDisplay } from '@/app/shared/utils/date.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';

@Component({
    selector: 'app-clients-list-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        TableModule,
        ButtonModule,
        InputTextModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent
    ],
    template: `
        <app-page-header title="Müşteriler" subtitle="Hasta yönetimi" description="Kayıtlı müşteri listesi ve detay.">
            <a actions routerLink="/panel/clients/new" pButton type="button" label="Yeni Müşteri" icon="pi pi-plus" class="p-button-primary"></a>
        </app-page-header>

        <div class="card mb-6">
            <div class="grid grid-cols-12 gap-4 items-end">
                <div class="col-span-12 md:col-span-9">
                    <label for="clientSearch" class="block text-sm font-medium text-muted-color mb-2">Arama</label>
                    <input
                        pInputText
                        id="clientSearch"
                        class="w-full"
                        [(ngModel)]="searchInput"
                        placeholder="Ad, telefon, e-posta…"
                        (keyup.enter)="applySearch()"
                    />
                </div>
                <div class="col-span-12 md:col-span-3 flex flex-wrap gap-2">
                    <p-button [label]="copy.buttonSearch" icon="pi pi-search" (onClick)="applySearch()" [disabled]="loading()" />
                    <p-button [label]="copy.buttonClear" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
                </div>
            </div>
        </div>

        @if (loading()) {
            <app-loading-state message="Müşteri listesi yükleniyor…" />
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
                        [tableStyle]="{ 'min-width': '50rem' }"
                        [showCurrentPageReport]="true"
                        currentPageReportTemplate="{first} - {last} / {totalRecords}"
                    >
                        <ng-template #header>
                            <tr>
                                <th>Ad Soyad</th>
                                <th>Telefon</th>
                                <th>E-posta</th>
                                <th>Kayıt Tarihi</th>
                                <th style="width: 8rem">İşlemler</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr>
                                <td class="font-medium">{{ row.fullName }}</td>
                                <td>{{ row.phone }}</td>
                                <td>{{ row.email }}</td>
                                <td>{{ formatDate(row.createdAtUtc) }}</td>
                                <td>
                                    <a [routerLink]="['/panel/clients', row.id]" class="text-primary font-medium no-underline">Detay</a>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                }
            </div>
        }
    `
})
export class ClientsListPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly clientsService = inject(ClientsService);

    readonly loading = signal(false);
    readonly error = signal<string | null>(null);

    readonly rawItems = signal<ClientListItemVm[]>([]);
    readonly totalItems = signal(0);
    readonly pageSize = signal(10);
    readonly first = signal(0);
    readonly currentPage = signal(1);

    /** Sunucuya giden arama (Ara ile uygulanır) */
    readonly activeSearch = signal('');

    searchInput = '';
    readonly displayedRows = computed(() => this.rawItems());

    readonly formatDate = (v: string | null) => formatDateDisplay(v);
    private suppressNextLazy = false;
    private lastLoadKey = '';

    ngOnInit(): void {
        this.suppressNextLazy = true;
        this.loadFromServer(1, this.pageSize(), this.activeSearch());
    }

    applySearch(): void {
        this.activeSearch.set(this.searchInput.trim());
        this.first.set(0);
        this.loadFromServer(1, this.pageSize(), this.activeSearch());
    }

    resetFilters(): void {
        this.searchInput = '';
        this.activeSearch.set('');
        this.first.set(0);
        this.loadFromServer(1, this.pageSize(), '');
    }

    reload(): void {
        this.loadFromServer(this.currentPage(), this.pageSize(), this.activeSearch(), true);
    }

    onTableLazyLoad(event: TableLazyLoadEvent): void {
        if (this.suppressNextLazy) {
            this.suppressNextLazy = false;
            return;
        }
        const rows = event.rows ?? 10;
        const first = event.first ?? 0;
        const page = Math.floor(first / rows) + 1;
        this.loadFromServer(page, rows, this.activeSearch());
    }

    private loadFromServer(page: number, pageSize: number, search: string, force = false): void {
        const key = `${page}|${pageSize}|${search.trim()}`;
        if (!force && key === this.lastLoadKey) {
            return;
        }
        this.lastLoadKey = key;
        this.loading.set(true);
        this.error.set(null);
        this.clientsService
            .getClients({
                page,
                pageSize,
                search: search || undefined
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
