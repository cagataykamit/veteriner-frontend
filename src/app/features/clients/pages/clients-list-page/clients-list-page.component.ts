import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Paginator } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/types/paginator';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import type { ClientListItemVm } from '@/app/features/clients/models/client-vm.model';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLIENTS_CREATE_CLAIM, CLIENTS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';
import { TrDatePipe } from '@/app/shared/pipes/tr-date.pipe';

type ClientsListState = {
    search: string;
    page: number;
    pageSize: number;
};

const CLIENTS_LIST_STATE_KEY = 'panel:clients:listState';

@Component({
    selector: 'app-clients-list-page',
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
        AppErrorStateComponent,
        FilterFieldComponent,
        SearchInputComponent,
        AppRowActionButtonComponent,
        TrDatePipe
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <div class="card">
            <div class="flex flex-col gap-4">
                <app-list-header class="pb-3 border-b border-surface-200 dark:border-surface-700" title="Müşteriler" [count]="totalItems()">
                    <app-filter-field label="Arama" labelFor="clientSearch" [active]="isSearchActive()" width="grow">
                        <app-search-input inputId="clientSearch" placeholder="Ad, e-posta, telefon…" [(value)]="searchInput" (searchRequested)="applySearch()" />
                    </app-filter-field>
                    <p-button actions [label]="copy.buttonClear" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
                    @if (canCreateClient && !ro.mutationBlocked()) {
                        <a actions routerLink="/panel/clients/new" pButton type="button" class="p-button-primary"><i class="pi pi-plus"></i>Yeni Müşteri</a>
                    } @else if (canCreateClient && ro.mutationBlocked()) {
                        <button actions pButton type="button" [disabled]="true" class="p-button-secondary"><i class="pi pi-lock"></i>Yeni Müşteri (salt okunur)</button>
                    }
                </app-list-header>
                @if (error()) {
                    <app-error-state [detail]="error()!" (retry)="reload()" />
                } @else if (initialLoad() && loading()) {
                    <app-loading-state message="Müşteri listesi yükleniyor…" />
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
                                [loading]="loading()"
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
                                        <td>{{ formatClientPhoneForDisplay(row.phone) }}</td>
                                        <td>{{ row.email }}</td>
                                        <td>{{ row.createdAtUtc | trDate }}</td>
                                        <td>
                                            <div class="flex items-center gap-1">
                                                <app-row-action-button action="detail" [link]="['/panel/clients', row.id]" />
                                                @if (canUpdateClient && !ro.mutationBlocked()) {
                                                    <app-row-action-button action="edit" [link]="['/panel/clients', row.id, 'edit']" />
                                                } @else if (canUpdateClient && ro.mutationBlocked()) {
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
                                        <a [routerLink]="['/panel/clients', row.id]" class="text-primary no-underline break-words">{{ row.fullName }}</a>
                                    </div>
                                    <div class="space-y-2 mb-3 min-w-0 text-sm">
                                        <div>
                                            <span class="text-muted-color font-medium">Telefon: </span>
                                            <span class="break-words">{{ formatClientPhoneForDisplay(row.phone) }}</span>
                                        </div>
                                        <div>
                                            <span class="text-muted-color font-medium">E-posta: </span>
                                            <span class="break-all">{{ row.email }}</span>
                                        </div>
                                    </div>
                                    @if (row.createdAtUtc) {
                                        <div class="text-xs text-muted-color mb-3 min-w-0">Kayıt: {{ row.createdAtUtc | trDate }}</div>
                                    }
                                    <div class="flex justify-end items-center gap-1 pt-1 border-t border-surface-200 dark:border-surface-700">
                                        <app-row-action-button action="detail" [link]="['/panel/clients', row.id]" />
                                        @if (canUpdateClient && !ro.mutationBlocked()) {
                                            <app-row-action-button action="edit" [link]="['/panel/clients', row.id, 'edit']" />
                                        } @else if (canUpdateClient && ro.mutationBlocked()) {
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
export class ClientsListPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    readonly formatClientPhoneForDisplay = formatClientPhoneForDisplay;
    readonly ro = inject(TenantReadOnlyContextService);
    private readonly auth = inject(AuthService);

    private readonly clientsService = inject(ClientsService);

    readonly rowsPerPageOptions = [10, 20, 25, 50];

    /** İlk yüklemede boş tablo flaşını önlemek için true başlar. */
    readonly loading = signal(true);
    readonly initialLoad = signal(true);
    readonly error = signal<string | null>(null);

    readonly rawItems = signal<ClientListItemVm[]>([]);
    readonly totalItems = signal(0);
    readonly pageSize = signal(10);
    readonly first = signal(0);
    readonly currentPage = signal(1);

    readonly activeSearch = signal('');
    searchInput = '';

    readonly displayedRows = computed(() => this.rawItems());
    readonly canCreateClient = this.auth.hasOperationClaim(CLIENTS_CREATE_CLAIM);
    readonly canUpdateClient = this.auth.hasOperationClaim(CLIENTS_UPDATE_CLAIM);

    private suppressNextLazy = false;
    private lastLoadKey = '';

    ngOnInit(): void {
        const restored = this.restoreStateFromSessionStorage();

        if (!restored) {
            this.currentPage.set(1);
            this.first.set(0);
        }

        this.suppressNextLazy = true;
        this.loadFromServer(this.currentPage(), this.pageSize(), this.activeSearch());
    }

    applySearch(): void {
        this.activeSearch.set(this.searchInput.trim());
        this.first.set(0);
        this.currentPage.set(1);
        this.suppressNextLazy = true;
        this.persistStateToSessionStorage(1, this.pageSize());
        this.loadFromServer(1, this.pageSize(), this.activeSearch());
    }

    resetFilters(): void {
        this.searchInput = '';
        this.activeSearch.set('');
        this.first.set(0);
        this.currentPage.set(1);
        this.suppressNextLazy = true;
        this.clearStateFromSessionStorage();
        this.loadFromServer(1, this.pageSize(), '');
    }

    reload(): void {
        this.suppressNextLazy = true;
        this.loadFromServer(this.currentPage(), this.pageSize(), this.activeSearch(), true);
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
            this.loadFromServer(1, rows, this.activeSearch());

            return;
        }

        const page = Math.floor(eventFirst / rows) + 1;

        this.persistStateToSessionStorage(page, rows);
        this.loadFromServer(page, rows, this.activeSearch());
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
            this.loadFromServer(1, rows, this.activeSearch());

            return;
        }

        const page = Math.floor(eventFirst / rows) + 1;

        this.persistStateToSessionStorage(page, rows);
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
                    this.persistStateToSessionStorage(r.page, r.pageSize);
                    this.initialLoad.set(false);
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

    private restoreStateFromSessionStorage(): boolean {
        const raw = sessionStorage.getItem(CLIENTS_LIST_STATE_KEY);

        if (!raw) {
            return false;
        }

        try {
            const parsed = JSON.parse(raw) as Partial<ClientsListState>;
            const page = Number(parsed.page);
            const pageSize = Number(parsed.pageSize);

            if (!Number.isFinite(page) || page < 1 || !Number.isFinite(pageSize) || pageSize < 1) {
                sessionStorage.removeItem(CLIENTS_LIST_STATE_KEY);

                return false;
            }

            this.searchInput = typeof parsed.search === 'string' ? parsed.search : '';
            this.activeSearch.set(this.searchInput.trim());
            this.pageSize.set(pageSize);
            this.currentPage.set(page);
            this.first.set((page - 1) * pageSize);

            return true;
        } catch {
            sessionStorage.removeItem(CLIENTS_LIST_STATE_KEY);

            return false;
        }
    }

    private persistStateToSessionStorage(page: number, pageSize: number): void {
        const state: ClientsListState = {
            search: this.searchInput.trim(),
            page,
            pageSize
        };

        sessionStorage.setItem(CLIENTS_LIST_STATE_KEY, JSON.stringify(state));
    }

    private clearStateFromSessionStorage(): void {
        sessionStorage.removeItem(CLIENTS_LIST_STATE_KEY);
    }
}
