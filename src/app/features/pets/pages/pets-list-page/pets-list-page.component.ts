import { debouncedAction } from '@/app/shared/ui/search-input/debounced-action';
import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CLEAR_CONTEXT_FILTER_QUERY, readContextFilterParam } from '@/app/shared/utils/context-filter.utils';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Paginator } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/types/paginator';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import { AppContextFilterChipComponent } from '@/app/shared/ui/context-filter-chip/app-context-filter-chip.component';
import type { PetListItemVm } from '@/app/features/pets/models/pet-vm.model';
import { PET_LIFE_STATUS_FILTER_OPTIONS, PET_LIST_DEFAULT_STATUS, parsePetListStatusFilter, type PetListStatusFilter } from '@/app/features/pets/utils/pet-status.utils';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { SpeciesService } from '@/app/features/species/services/species.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { PETS_CREATE_CLAIM, PETS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';

type PetsListState = {
    search: string;
    speciesId: string;
    /** Yoksa varsayılan (Yaşayanlar, ADR-025); `All` = tümü, vefat edenler rozetle ayrışır. */
    status?: string;
    page: number;
    pageSize: number;
};

const PETS_LIST_STATE_KEY = 'panel:pets:listState';

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
        AppListHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppContextFilterChipComponent,
        FilterFieldComponent,
        SearchInputComponent,
        AppRowActionButtonComponent
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        @if (activeClientId()) {
            <app-context-filter-chip label="Seçili müşterinin hastaları gösteriliyor" (clear)="clearClientContext()" />
        }

        <div class="card">
            <div class="flex flex-col gap-4">
                <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                    <app-list-header class="mb-3" title="Hastalar" [count]="totalItems()">
                        <app-filter-field label="Arama" labelFor="petSearch" [active]="isSearchActive()" width="grow">
                            <app-search-input inputId="petSearch" placeholder="Hasta, tür, ırk, mikroçip; sahip adı veya telefonu…" [(value)]="searchInput" (searchRequested)="applyFilters()" />
                        </app-filter-field>
                        <button pButton type="button" actions severity="secondary" (click)="resetFilters()" [disabled]="loading()"><i class="p-button-icon pi pi-times"></i>{{ copy.buttonClear }}</button>
                        @if (canCreatePet && !ro.mutationBlocked()) {
                            <a actions routerLink="/panel/pets/new" pButton type="button" class="p-button-primary"><i class="pi pi-plus"></i>Yeni Hasta</a>
                        } @else if (canCreatePet && ro.mutationBlocked()) {
                            <button actions pButton type="button" [disabled]="true" class="p-button-secondary"><i class="pi pi-lock"></i>Yeni Hasta (salt okunur)</button>
                        }
                    </app-list-header>
                    <div class="flex flex-wrap items-end gap-3">
                        <app-filter-field label="Tür" labelId="lblPetSpecies" [active]="isSpeciesActive()" width="select">
                            <p-select
                                ariaLabelledBy="lblPetSpecies"
                                inputId="petSpecies"
                                [options]="speciesOptions()"
                                [(ngModel)]="speciesIdInput"
                                optionLabel="label"
                                optionValue="value"
                                [placeholder]="copy.filterPlaceholderAll"
                                class="w-full"
                                [showClear]="true"
                                [loading]="loadingSpecies()"
                                (ngModelChange)="scheduleApply()"
                            />
                        </app-filter-field>
                        <app-filter-field label="Durum" labelId="lblPetStatus" [active]="isStatusActive()" width="select">
                            <p-select ariaLabelledBy="lblPetStatus" inputId="petStatus" [options]="statusOptions" [(ngModel)]="statusInput" optionLabel="label" optionValue="value" class="w-full" (ngModelChange)="scheduleApply()" />
                        </app-filter-field>
                    </div>
                </div>
                @if (loading()) {
                    <app-loading-state message="Hasta listesi yükleniyor…" />
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
                                    <tr [class.text-muted-color]="row.status === 'Deceased'">
                                        <td class="font-medium">
                                            {{ row.name }}
                                            @if (row.status === 'Deceased') {
                                                <span class="ml-2 text-xs font-medium border border-surface-300 dark:border-surface-600 rounded-border px-1.5 py-0.5" data-testid="pet-row-deceased">Vefat</span>
                                            }
                                        </td>
                                        <td>{{ row.speciesName }}</td>
                                        <td>{{ row.breed }}</td>
                                        <td>{{ row.colorName }}</td>
                                        <td>{{ row.weight }}</td>
                                        <td>
                                            <div class="flex items-center gap-1">
                                                <app-row-action-button action="detail" [link]="['/panel/pets', row.id]" />
                                                @if (canUpdatePet && !ro.mutationBlocked()) {
                                                    <app-row-action-button action="edit" [link]="['/panel/pets', row.id, 'edit']" />
                                                } @else if (canUpdatePet && ro.mutationBlocked()) {
                                                    <app-row-action-button action="edit" label="Düzenle (salt okunur)" [disabled]="true" />
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
                                        <a [routerLink]="['/panel/pets', row.id]" class="text-primary no-underline break-words">{{ row.name }}</a>
                                        @if (row.status === 'Deceased') {
                                            <span class="ml-2 text-xs font-medium text-muted-color border border-surface-300 dark:border-surface-600 rounded-border px-1.5 py-0.5">Vefat</span>
                                        }
                                    </div>
                                    <div class="space-y-2 mb-3 min-w-0 text-sm">
                                        @if (row.clientId) {
                                            <div>
                                                <span class="text-muted-color font-medium">Sahip: </span>
                                                <a [routerLink]="['/panel/clients', row.clientId]" class="text-primary font-medium no-underline break-words"> Müşteri </a>
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
                                    <div class="flex justify-end items-center gap-1 pt-1 border-t border-surface-200 dark:border-surface-700">
                                        <app-row-action-button action="detail" [link]="['/panel/pets', row.id]" />
                                        @if (canUpdatePet && !ro.mutationBlocked()) {
                                            <app-row-action-button action="edit" [link]="['/panel/pets', row.id, 'edit']" />
                                        } @else if (canUpdatePet && ro.mutationBlocked()) {
                                            <app-row-action-button action="edit" label="Düzenle (salt okunur)" [disabled]="true" />
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
                                (onPageChange)="onMobilePageChange($event)"
                            />
                        </div>
                    }
                }
            </div>
        </div>
    `
})
export class PetsListPageComponent implements OnInit {
    protected readonly scheduleApply = debouncedAction(() => this.applyFilters());
    readonly copy = PANEL_COPY;
    readonly ro = inject(TenantReadOnlyContextService);
    private readonly auth = inject(AuthService);

    private readonly petsService = inject(PetsService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly speciesService = inject(SpeciesService);

    /** İlk yüklemede boş tablo flaşını önlemek için true başlar. */
    readonly loading = signal(true);
    readonly loadingSpecies = signal(false);
    readonly error = signal<string | null>(null);

    readonly rawItems = signal<PetListItemVm[]>([]);
    readonly totalItems = signal(0);
    readonly rowsPerPageOptions = [10, 20, 25, 50];
    readonly pageSize = signal(10);
    readonly first = signal(0);
    readonly currentPage = signal(1);

    readonly activeSearch = signal('');
    readonly activeSpeciesId = signal('');
    /** Yalnız müşteri kartındaki "Tümü →" bağlantısından (`?clientId=`) gelir; sahip araması "Arama" kutusundadır. */
    readonly activeClientId = signal('');
    readonly activeStatus = signal<PetListStatusFilter>(PET_LIST_DEFAULT_STATUS);

    searchInput = '';
    speciesIdInput = '';
    statusInput: PetListStatusFilter = PET_LIST_DEFAULT_STATUS;
    readonly statusOptions = [...PET_LIFE_STATUS_FILTER_OPTIONS];
    readonly speciesOptions = signal<{ label: string; value: string }[]>([]);
    readonly canCreatePet = this.auth.hasOperationClaim(PETS_CREATE_CLAIM);
    readonly canUpdatePet = this.auth.hasOperationClaim(PETS_UPDATE_CLAIM);

    readonly displayedRows = computed(() => this.rawItems());
    private suppressNextLazy = false;
    private lastLoadKey = '';

    ngOnInit(): void {
        const restored = this.restoreStateFromSessionStorage();

        if (!restored) {
            this.currentPage.set(1);
            this.first.set(0);
        }

        const contextClientId = readContextFilterParam(this.route, 'clientId');

        if (contextClientId) {
            this.activeClientId.set(contextClientId);
            this.currentPage.set(1);
            this.first.set(0);
        }

        // Bağlantıyla gelen `?status=all|active|deceased` seçilir; müşteri kartının "Tümü →" bağlantısı (`?clientId`) önceki davranışı korur: o müşterinin tüm hastaları.
        const linkedStatus = parsePetListStatusFilter(this.route.snapshot.queryParamMap.get('status')) ?? (contextClientId ? 'All' : null);

        if (linkedStatus) {
            this.statusInput = linkedStatus;
            this.activeStatus.set(linkedStatus);
        }

        this.loadSpeciesOptions();
        this.suppressNextLazy = true;
        this.loadFromServer(this.currentPage(), this.pageSize(), this.activeSearch(), this.activeSpeciesId(), this.activeClientId());
    }

    applyFilters(): void {
        this.activeSearch.set(this.searchInput.trim());
        this.activeSpeciesId.set(this.speciesIdInput.trim());
        this.activeStatus.set(this.statusInput ?? PET_LIST_DEFAULT_STATUS);
        this.first.set(0);
        this.currentPage.set(1);
        this.persistStateToSessionStorage(1, this.pageSize());
        this.loadFromServer(1, this.pageSize(), this.activeSearch(), this.activeSpeciesId(), this.activeClientId());
    }

    resetFilters(): void {
        this.searchInput = '';
        this.speciesIdInput = '';
        this.statusInput = PET_LIST_DEFAULT_STATUS;
        this.activeSearch.set('');
        this.activeSpeciesId.set('');
        this.activeClientId.set('');
        this.activeStatus.set(PET_LIST_DEFAULT_STATUS);
        this.first.set(0);
        this.currentPage.set(1);
        this.clearStateFromSessionStorage();
        this.loadFromServer(1, this.pageSize(), '', '', '');
    }

    clearClientContext(): void {
        this.activeClientId.set('');
        void this.router.navigate([], { queryParams: CLEAR_CONTEXT_FILTER_QUERY, queryParamsHandling: 'merge', replaceUrl: true });
        this.first.set(0);
        this.currentPage.set(1);
        this.loadFromServer(1, this.pageSize(), this.activeSearch(), this.activeSpeciesId(), '');
    }

    reload(): void {
        this.loadFromServer(this.currentPage(), this.pageSize(), this.activeSearch(), this.activeSpeciesId(), this.activeClientId(), true);
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
            this.loadFromServer(1, rows, this.activeSearch(), this.activeSpeciesId(), this.activeClientId());

            return;
        }

        const page = Math.floor(eventFirst / rows) + 1;

        this.persistStateToSessionStorage(page, rows);
        this.loadFromServer(page, rows, this.activeSearch(), this.activeSpeciesId(), this.activeClientId());
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
            this.loadFromServer(1, rows, this.activeSearch(), this.activeSpeciesId(), this.activeClientId());

            return;
        }

        const page = Math.floor(eventFirst / rows) + 1;

        this.persistStateToSessionStorage(page, rows);
        this.loadFromServer(page, rows, this.activeSearch(), this.activeSpeciesId(), this.activeClientId());
    }

    private loadFromServer(page: number, pageSize: number, search: string, speciesId: string, clientId: string, force = false): void {
        const status = this.activeStatus();
        const key = `${page}|${pageSize}|${search.trim()}|${speciesId.trim()}|${clientId.trim()}|${status}`;

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
                clientId: clientId || undefined,
                status: status === 'All' ? undefined : status
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

    isSearchActive(): boolean {
        return !!this.activeSearch().trim();
    }

    isSpeciesActive(): boolean {
        return !!this.activeSpeciesId().trim();
    }

    isStatusActive(): boolean {
        return this.activeStatus() !== PET_LIST_DEFAULT_STATUS;
    }

    private restoreStateFromSessionStorage(): boolean {
        const raw = sessionStorage.getItem(PETS_LIST_STATE_KEY);

        if (!raw) {
            return false;
        }

        try {
            const parsed = JSON.parse(raw) as Partial<PetsListState>;
            const page = Number(parsed.page);
            const pageSize = Number(parsed.pageSize);

            if (!Number.isFinite(page) || page < 1 || !Number.isFinite(pageSize) || pageSize < 1) {
                sessionStorage.removeItem(PETS_LIST_STATE_KEY);

                return false;
            }

            this.searchInput = typeof parsed.search === 'string' ? parsed.search : '';
            this.speciesIdInput = typeof parsed.speciesId === 'string' ? parsed.speciesId : '';
            this.statusInput = parsePetListStatusFilter(parsed.status) ?? PET_LIST_DEFAULT_STATUS;
            this.activeSearch.set(this.searchInput.trim());
            this.activeSpeciesId.set(this.speciesIdInput.trim());
            this.activeStatus.set(this.statusInput);
            this.pageSize.set(pageSize);
            this.currentPage.set(page);
            this.first.set((page - 1) * pageSize);

            return true;
        } catch {
            sessionStorage.removeItem(PETS_LIST_STATE_KEY);

            return false;
        }
    }

    private persistStateToSessionStorage(page: number, pageSize: number): void {
        const state: PetsListState = {
            search: this.searchInput.trim(),
            speciesId: this.speciesIdInput.trim(),
            status: this.activeStatus(),
            page,
            pageSize
        };

        sessionStorage.setItem(PETS_LIST_STATE_KEY, JSON.stringify(state));
    }

    private clearStateFromSessionStorage(): void {
        sessionStorage.removeItem(PETS_LIST_STATE_KEY);
    }
}
