import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Paginator } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/types/paginator';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import type { PetListItemVm } from '@/app/features/pets/models/pet-vm.model';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { SpeciesService } from '@/app/features/species/services/species.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';

@Component({
    selector: 'app-pets-list-page',
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
        AppErrorStateComponent
    ],
    template: `
        <app-page-header title="Hayvanlar" subtitle="Hasta yönetimi" description="Kayıtlı hayvan listesi ve detay.">
            @if (!ro.mutationBlocked()) {
                <a actions routerLink="/panel/pets/new" pButton type="button" label="Yeni Hayvan" icon="pi pi-plus" class="p-button-primary"></a>
            } @else {
                <button
                    actions
                    pButton
                    type="button"
                    label="Yeni Hayvan (salt okunur)"
                    icon="pi pi-lock"
                    [disabled]="true"
                    class="p-button-secondary"
                ></button>
            }
        </app-page-header>

        <div class="card">
            @if (loading()) {
                <app-loading-state message="Hayvan listesi yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else {
                <div class="flex flex-col gap-4">
                    <div class="pb-3 border-b border-surface-200 dark:border-surface-700">
                        <div class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3 mb-3">
                            <div class="min-w-0">
                                <h5 class="m-0">Hayvanlar</h5>
                                @if (totalItems() > 0) {
                                    <span class="text-sm text-muted-color whitespace-nowrap">{{ totalItems() }} kayıt</span>
                                }
                            </div>
                            <div class="flex flex-col sm:flex-row gap-3 sm:items-end w-full xl:w-auto xl:min-w-[22rem] xl:max-w-2xl">
                                <div class="flex-1 min-w-0">
                                    <label for="petSearch" class="block text-xs font-medium text-muted-color mb-1">Arama</label>
                                    <input
                                        pInputText
                                        id="petSearch"
                                        class="w-full"
                                        [(ngModel)]="searchInput"
                                        placeholder="Hayvan, tür, ırk, sahip…"
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
                            <div class="col-span-12 md:col-span-6">
                                <span id="lblPetClient" class="block text-xs font-medium text-muted-color mb-1">Müşteri</span>
                                <p-select
                                    ariaLabelledBy="lblPetClient"
                                    inputId="petClient"
                                    [options]="clientOptions()"
                                    [(ngModel)]="clientIdInput"
                                    optionLabel="label"
                                    optionValue="value"
                                    [placeholder]="copy.filterPlaceholderAll"
                                    styleClass="w-full"
                                    [showClear]="true"
                                    [loading]="loadingClients()"
                                />
                            </div>
                            <div class="col-span-12 md:col-span-6">
                                <span id="lblPetSpecies" class="block text-xs font-medium text-muted-color mb-1">Tür</span>
                                <p-select
                                    ariaLabelledBy="lblPetSpecies"
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
                    </div>

                    <div class="lg:hidden space-y-3">
                        @for (row of displayedRows(); track row.id) {
                            <div
                                class="rounded-border border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4 shadow-sm"
                            >
                                <div class="text-sm font-medium text-surface-900 dark:text-surface-0 min-w-0 mb-3">
                                    <a [routerLink]="['/panel/pets', row.id]" class="text-primary no-underline break-words">{{ row.name }}</a>
                                </div>
                                <div class="space-y-2 mb-3 min-w-0 text-sm">
                                    @if (row.clientId) {
                                        <div>
                                            <span class="text-muted-color font-medium">Sahip: </span>
                                            <a
                                                [routerLink]="['/panel/clients', row.clientId]"
                                                class="text-primary font-medium no-underline break-words"
                                            >
                                                Müşteri
                                            </a>
                                        </div>
                                    }
                                    <div>
                                        <span class="text-muted-color font-medium">Tür: </span>
                                        <span class="break-words">{{ row.speciesName }}</span>
                                    </div>
                                    <div>
                                        <span class="text-muted-color font-medium">Irk: </span>
                                        <span class="break-words">{{ row.breed }}</span>
                                    </div>
                                </div>
                                @if (row.colorName || row.weight) {
                                    <div class="text-xs text-muted-color mb-3 min-w-0 break-words">
                                        @if (row.colorName) {
                                            <span>Renk: {{ row.colorName }}</span>
                                        }
                                        @if (row.colorName && row.weight) {
                                            <span> · </span>
                                        }
                                        @if (row.weight) {
                                            <span>{{ row.weight }} kg</span>
                                        }
                                    </div>
                                }
                                <div class="flex justify-end pt-1 border-t border-surface-200 dark:border-surface-700">
                                    <a [routerLink]="['/panel/pets', row.id]" class="text-primary font-medium no-underline">Detay →</a>
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
export class PetsListPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    readonly ro = inject(TenantReadOnlyContextService);

    private readonly petsService = inject(PetsService);
    private readonly speciesService = inject(SpeciesService);
    private readonly clientsService = inject(ClientsService);

    /** İlk yüklemede boş tablo flaşını önlemek için true başlar. */
    readonly loading = signal(true);
    readonly loadingSpecies = signal(false);
    readonly loadingClients = signal(false);
    readonly error = signal<string | null>(null);

    readonly rawItems = signal<PetListItemVm[]>([]);
    readonly totalItems = signal(0);
    readonly pageSize = signal(10);
    readonly first = signal(0);
    readonly currentPage = signal(1);

    readonly activeSearch = signal('');
    readonly activeSpeciesId = signal('');
    readonly activeClientId = signal('');

    searchInput = '';
    speciesIdInput = '';
    clientIdInput = '';
    readonly speciesOptions = signal<{ label: string; value: string }[]>([]);
    readonly clientOptions = signal<{ label: string; value: string }[]>([]);

    readonly displayedRows = computed(() => this.rawItems());

    private suppressNextLazy = false;
    private lastLoadKey = '';

    ngOnInit(): void {
        this.loadSpeciesOptions();
        this.loadClientOptions();
        this.suppressNextLazy = true;
        this.loadFromServer(1, this.pageSize(), this.activeSearch(), this.activeSpeciesId(), this.activeClientId());
    }

    applyFilters(): void {
        this.activeSearch.set(this.searchInput.trim());
        this.activeSpeciesId.set(this.speciesIdInput.trim());
        this.activeClientId.set(this.clientIdInput.trim());
        this.first.set(0);
        this.loadFromServer(1, this.pageSize(), this.activeSearch(), this.activeSpeciesId(), this.activeClientId());
    }

    resetFilters(): void {
        this.searchInput = '';
        this.speciesIdInput = '';
        this.clientIdInput = '';
        this.activeSearch.set('');
        this.activeSpeciesId.set('');
        this.activeClientId.set('');
        this.first.set(0);
        this.loadFromServer(1, this.pageSize(), '', '', '');
    }

    reload(): void {
        this.loadFromServer(
            this.currentPage(),
            this.pageSize(),
            this.activeSearch(),
            this.activeSpeciesId(),
            this.activeClientId(),
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
        this.loadFromServer(page, rows, this.activeSearch(), this.activeSpeciesId(), this.activeClientId());
    }

    onMobilePageChange(state: PaginatorState): void {
        const rows = state.rows ?? this.pageSize();
        const first = state.first ?? 0;
        const page = Math.floor(first / rows) + 1;
        this.suppressNextLazy = true;
        this.loadFromServer(page, rows, this.activeSearch(), this.activeSpeciesId(), this.activeClientId());
    }

    private loadFromServer(
        page: number,
        pageSize: number,
        search: string,
        speciesId: string,
        clientId: string,
        force = false
      ): void {
        const key = `${page}|${pageSize}|${search.trim()}|${speciesId.trim()}|${clientId.trim()}`;
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
                speciesId: speciesId || undefined,
                clientId: clientId || undefined
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

    private loadClientOptions(): void {
        this.loadingClients.set(true);
        this.clientsService.getClients({ page: 1, pageSize: 300 }).subscribe({
            next: (r) => {
                this.clientOptions.set(
                    r.items.map((c) => ({
                        label: c.fullName?.trim() ? c.fullName : c.id,
                        value: c.id
                    }))
                );
                this.loadingClients.set(false);
            },
            error: () => {
                this.loadingClients.set(false);
            }
        });
    }
}
