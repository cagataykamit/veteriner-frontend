import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import { filterClientListByStatus } from '@/app/features/clients/data/client.mapper';
import type { ClientListItemVm } from '@/app/features/clients/models/client-vm.model';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { clientStatusLabel, clientStatusSeverity } from '@/app/features/clients/utils/client-status.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatDateDisplay } from '@/app/shared/utils/date.utils';

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
        SelectModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    template: `
        <app-page-header title="Clients" subtitle="Hasta yönetimi" description="Kayıtlı client listesi ve detay." />

        <div class="card mb-6">
            <div class="grid grid-cols-12 gap-4 items-end">
                <div class="col-span-12 md:col-span-5">
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
                <div class="col-span-12 md:col-span-4">
                    <label for="clientStatus" class="block text-sm font-medium text-muted-color mb-2">Durum</label>
                    <p-select
                        inputId="clientStatus"
                        [options]="statusOptions"
                        [(ngModel)]="statusFilter"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Tümü"
                        styleClass="w-full"
                        [showClear]="true"
                    />
                </div>
                <div class="col-span-12 md:col-span-3 flex flex-wrap gap-2">
                    <p-button label="Ara" icon="pi pi-search" (onClick)="applySearch()" [disabled]="loading()" />
                    <p-button label="Temizle" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
                </div>
            </div>
            <p class="text-muted-color text-sm mt-3 mb-0">
                Durum filtresi, API yanıtında <span class="font-medium">status</span> alanı varsa bu sayfadaki kayıtlar üzerinde uygulanır.
            </p>
        </div>

        @if (loading()) {
            <app-loading-state message="Client listesi yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else {
            <div class="card">
                <h5 class="mb-4">Kayıtlar</h5>
                @if (displayedRows().length === 0) {
                    <app-empty-state message="Kayıt bulunamadı." hint="Arama veya filtreleri değiştirin." />
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
                                <th class="text-right">Pet Sayısı</th>
                                <th>Kayıt Tarihi</th>
                                <th>Durum</th>
                                <th style="width: 8rem">İşlemler</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr>
                                <td class="font-medium">{{ row.fullName }}</td>
                                <td>{{ row.phone }}</td>
                                <td>{{ row.email }}</td>
                                <td class="text-right">{{ row.petCount ?? '—' }}</td>
                                <td>{{ formatDate(row.createdAtUtc) }}</td>
                                <td>
                                    <app-status-tag [label]="statusLabel(row.status)" [severity]="statusSeverity(row.status)" />
                                </td>
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
export class ClientsListPageComponent {
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
    /** Tümü = '' — p-select null değerlerde sorun çıkarabildiği için boş string kullanılır. */
    statusFilter = '';

    readonly statusOptions = [
        { label: 'Tümü', value: '' },
        { label: 'Aktif', value: 'active' },
        { label: 'Pasif', value: 'inactive' }
    ];

    readonly displayedRows = computed(() =>
        filterClientListByStatus(this.rawItems(), this.statusFilter ? this.statusFilter : null)
    );

    readonly formatDate = (v: string | null) => formatDateDisplay(v);
    readonly statusLabel = clientStatusLabel;
    readonly statusSeverity = clientStatusSeverity;

    applySearch(): void {
        this.activeSearch.set(this.searchInput.trim());
        this.first.set(0);
        this.loadFromServer(1, this.pageSize(), this.activeSearch());
    }

    resetFilters(): void {
        this.searchInput = '';
        this.activeSearch.set('');
        this.statusFilter = '';
        this.first.set(0);
        this.loadFromServer(1, this.pageSize(), '');
    }

    reload(): void {
        this.loadFromServer(this.currentPage(), this.pageSize(), this.activeSearch());
    }

    onTableLazyLoad(event: TableLazyLoadEvent): void {
        const rows = event.rows ?? 10;
        const first = event.first ?? 0;
        const page = Math.floor(first / rows) + 1;
        this.loadFromServer(page, rows, this.activeSearch());
    }

    private loadFromServer(page: number, pageSize: number, search: string): void {
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
