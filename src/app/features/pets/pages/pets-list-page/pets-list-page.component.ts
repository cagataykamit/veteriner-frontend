import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import { filterPetListByStatus } from '@/app/features/pets/data/pet.mapper';
import type { PetListItemVm } from '@/app/features/pets/models/pet-vm.model';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { petGenderLabel, petStatusLabel, petStatusSeverity } from '@/app/features/pets/utils/pet-status.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatDateDisplay } from '@/app/shared/utils/date.utils';

@Component({
    selector: 'app-pets-list-page',
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
        <app-page-header title="Pets" subtitle="Hasta yönetimi" description="Kayıtlı hayvan listesi ve detay." />

        <div class="card mb-6">
            <div class="grid grid-cols-12 gap-4 items-end">
                <div class="col-span-12 md:col-span-4">
                    <label for="petSearch" class="block text-sm font-medium text-muted-color mb-2">Arama</label>
                    <input
                        pInputText
                        id="petSearch"
                        class="w-full"
                        [(ngModel)]="searchInput"
                        placeholder="Ad, sahip, tür…"
                        (keyup.enter)="applySearch()"
                    />
                </div>
                <div class="col-span-12 md:col-span-3">
                    <label for="petSpecies" class="block text-sm font-medium text-muted-color mb-2">Tür (species)</label>
                    <input
                        pInputText
                        id="petSpecies"
                        class="w-full"
                        [(ngModel)]="speciesInput"
                        placeholder="Örn. Köpek, Kedi"
                        (keyup.enter)="applySearch()"
                    />
                </div>
                <div class="col-span-12 md:col-span-3">
                    <label for="petStatus" class="block text-sm font-medium text-muted-color mb-2">Durum</label>
                    <p-select
                        inputId="petStatus"
                        [options]="statusOptions"
                        [(ngModel)]="statusFilter"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Tümü"
                        styleClass="w-full"
                        [showClear]="true"
                    />
                </div>
                <div class="col-span-12 md:col-span-2 flex flex-wrap gap-2">
                    <p-button label="Ara" icon="pi pi-search" (onClick)="applySearch()" [disabled]="loading()" />
                    <p-button label="Temizle" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
                </div>
            </div>
            <p class="text-muted-color text-sm mt-3 mb-0">
                Durum filtresi, API yanıtında <span class="font-medium">status</span> alanı varsa bu sayfadaki kayıtlar üzerinde uygulanır. Tür alanı
                <span class="font-medium">Species</span> query parametresi olarak gönderilir (backend desteklemiyorsa yok sayılır).
            </p>
        </div>

        @if (loading()) {
            <app-loading-state message="Pet listesi yükleniyor…" />
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
                        [tableStyle]="{ 'min-width': '60rem' }"
                        [showCurrentPageReport]="true"
                        currentPageReportTemplate="{first} - {last} / {totalRecords}"
                    >
                        <ng-template #header>
                            <tr>
                                <th>Ad</th>
                                <th>Tür</th>
                                <th>Cins</th>
                                <th>Sahibi</th>
                                <th>Cinsiyet</th>
                                <th>Doğum Tarihi</th>
                                <th>Durum</th>
                                <th style="width: 8rem">İşlemler</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr>
                                <td class="font-medium">{{ row.name }}</td>
                                <td>{{ row.species }}</td>
                                <td>{{ row.breed }}</td>
                                <td>{{ row.ownerName }}</td>
                                <td>{{ genderLabel(row.gender) }}</td>
                                <td>{{ formatDate(row.birthDateUtc) }}</td>
                                <td>
                                    <app-status-tag [label]="statusLabel(row.status)" [severity]="statusSeverity(row.status)" />
                                </td>
                                <td>
                                    <a [routerLink]="['/panel/pets', row.id]" class="text-primary font-medium no-underline">Detay</a>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                }
            </div>
        }
    `
})
export class PetsListPageComponent {
    private readonly petsService = inject(PetsService);

    readonly loading = signal(false);
    readonly error = signal<string | null>(null);

    readonly rawItems = signal<PetListItemVm[]>([]);
    readonly totalItems = signal(0);
    readonly pageSize = signal(10);
    readonly first = signal(0);
    readonly currentPage = signal(1);

    readonly activeSearch = signal('');
    readonly activeSpecies = signal('');

    searchInput = '';
    speciesInput = '';
    statusFilter = '';

    readonly statusOptions = [
        { label: 'Tümü', value: '' },
        { label: 'Aktif', value: 'active' },
        { label: 'Pasif', value: 'inactive' }
    ];

    readonly displayedRows = computed(() =>
        filterPetListByStatus(this.rawItems(), this.statusFilter ? this.statusFilter : null)
    );

    readonly formatDate = (v: string | null) => formatDateDisplay(v);
    readonly statusLabel = petStatusLabel;
    readonly statusSeverity = petStatusSeverity;
    readonly genderLabel = petGenderLabel;

    applySearch(): void {
        this.activeSearch.set(this.searchInput.trim());
        this.activeSpecies.set(this.speciesInput.trim());
        this.first.set(0);
        this.loadFromServer(1, this.pageSize(), this.activeSearch(), this.activeSpecies());
    }

    resetFilters(): void {
        this.searchInput = '';
        this.speciesInput = '';
        this.activeSearch.set('');
        this.activeSpecies.set('');
        this.statusFilter = '';
        this.first.set(0);
        this.loadFromServer(1, this.pageSize(), '', '');
    }

    reload(): void {
        this.loadFromServer(this.currentPage(), this.pageSize(), this.activeSearch(), this.activeSpecies());
    }

    onTableLazyLoad(event: TableLazyLoadEvent): void {
        const rows = event.rows ?? 10;
        const first = event.first ?? 0;
        const page = Math.floor(first / rows) + 1;
        this.loadFromServer(page, rows, this.activeSearch(), this.activeSpecies());
    }

    private loadFromServer(page: number, pageSize: number, search: string, species: string): void {
        this.loading.set(true);
        this.error.set(null);
        this.petsService
            .getPets({
                page,
                pageSize,
                search: search || undefined,
                species: species || undefined
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
