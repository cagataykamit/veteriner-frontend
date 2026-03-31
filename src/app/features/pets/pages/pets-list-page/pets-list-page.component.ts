import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import type { PetListItemVm } from '@/app/features/pets/models/pet-vm.model';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { SpeciesService } from '@/app/features/species/services/species.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';

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
        AppErrorStateComponent
    ],
    template: `
        <app-page-header title="Hayvanlar" subtitle="Hasta yönetimi" description="Kayıtlı hayvan listesi ve detay.">
            <a actions routerLink="/panel/pets/new" pButton type="button" label="Yeni Hayvan" icon="pi pi-plus" class="p-button-primary"></a>
        </app-page-header>

        <div class="card mb-6">
            <div class="grid grid-cols-12 gap-4 items-end">
                <div class="col-span-12 md:col-span-4">
                    <label for="petSearch" class="block text-sm font-medium text-muted-color mb-2">Arama</label>
                    <input
                        pInputText
                        id="petSearch"
                        class="w-full"
                        [(ngModel)]="searchInput"
                        placeholder="Ad, tür, cins…"
                        (keyup.enter)="applySearch()"
                    />
                </div>
                <div class="col-span-12 md:col-span-4">
                    <label for="petSpecies" class="block text-sm font-medium text-muted-color mb-2">Tür</label>
                    <p-select
                        inputId="petSpecies"
                        [options]="speciesOptions()"
                        [(ngModel)]="speciesIdInput"
                        optionLabel="label"
                        optionValue="value"
                        [placeholder]="copy.filterPlaceholderAll"
                        styleClass="w-full"
                        [showClear]="true"
                        [loading]="loadingSpecies()"
                    />
                </div>
                <div class="col-span-12 md:col-span-4 flex flex-wrap gap-2">
                    <p-button [label]="copy.buttonSearch" icon="pi pi-search" (onClick)="applySearch()" [disabled]="loading()" />
                    <p-button [label]="copy.buttonClear" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
                </div>
            </div>
            <p class="text-muted-color text-sm mt-3 mb-0">
                Tür filtresi <span class="font-medium">speciesId</span> sorgu parametresi olarak gönderilir.
            </p>
        </div>

        @if (loading()) {
            <app-loading-state message="Hayvan listesi yükleniyor…" />
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
                        [tableStyle]="{ 'min-width': '64rem' }"
                        [showCurrentPageReport]="true"
                        currentPageReportTemplate="{first} - {last} / {totalRecords}"
                    >
                        <ng-template #header>
                            <tr>
                                <th>Ad</th>
                                <th>Tür</th>
                                <th>Cins</th>
                                <th>Renk</th>
                                <th>Kilo (kg)</th>
                                <th style="width: 8rem">İşlemler</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr>
                                <td class="font-medium">{{ row.name }}</td>
                                <td>{{ row.speciesName }}</td>
                                <td>{{ row.breed }}</td>
                                <td>{{ row.colorName }}</td>
                                <td>{{ row.weight }}</td>
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
export class PetsListPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly petsService = inject(PetsService);
    private readonly speciesService = inject(SpeciesService);

    readonly loading = signal(false);
    readonly loadingSpecies = signal(false);
    readonly error = signal<string | null>(null);

    readonly rawItems = signal<PetListItemVm[]>([]);
    readonly totalItems = signal(0);
    readonly pageSize = signal(10);
    readonly first = signal(0);
    readonly currentPage = signal(1);

    readonly activeSearch = signal('');
    readonly activeSpeciesId = signal('');

    searchInput = '';
    speciesIdInput = '';
    readonly speciesOptions = signal<{ label: string; value: string }[]>([]);

    readonly displayedRows = computed(() => this.rawItems());

    private suppressNextLazy = false;
    private lastLoadKey = '';

    ngOnInit(): void {
        this.loadSpeciesOptions();
        this.suppressNextLazy = true;
        this.loadFromServer(1, this.pageSize(), this.activeSearch(), this.activeSpeciesId());
    }

    applySearch(): void {
        this.activeSearch.set(this.searchInput.trim());
        this.activeSpeciesId.set(this.speciesIdInput.trim());
        this.first.set(0);
        this.loadFromServer(1, this.pageSize(), this.activeSearch(), this.activeSpeciesId());
    }

    resetFilters(): void {
        this.searchInput = '';
        this.speciesIdInput = '';
        this.activeSearch.set('');
        this.activeSpeciesId.set('');
        this.first.set(0);
        this.loadFromServer(1, this.pageSize(), '', '');
    }

    reload(): void {
        this.loadFromServer(this.currentPage(), this.pageSize(), this.activeSearch(), this.activeSpeciesId(), true);
    }

    onTableLazyLoad(event: TableLazyLoadEvent): void {
        if (this.suppressNextLazy) {
            this.suppressNextLazy = false;
            return;
        }
        const rows = event.rows ?? 10;
        const first = event.first ?? 0;
        const page = Math.floor(first / rows) + 1;
        this.loadFromServer(page, rows, this.activeSearch(), this.activeSpeciesId());
    }

    private loadFromServer(page: number, pageSize: number, search: string, speciesId: string, force = false): void {
        const key = `${page}|${pageSize}|${search.trim()}|${speciesId.trim()}`;
        if (!force && key === this.lastLoadKey) {
            return;
        }
        this.lastLoadKey = key;
        this.loading.set(true);
        this.error.set(null);
        this.petsService
            .getPets({
                page,
                pageSize,
                search: search || undefined,
                speciesId: speciesId || undefined
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

    private loadSpeciesOptions(): void {
        this.loadingSpecies.set(true);
        this.speciesService.getSpeciesList({ activeOnly: true }).subscribe({
            next: (items) => {
                this.speciesOptions.set(
                    items.map((x) => ({
                        label: x.name || '-',
                        value: x.id
                    }))
                );
                this.loadingSpecies.set(false);
            },
            error: () => {
                this.loadingSpecies.set(false);
            }
        });
    }
}
