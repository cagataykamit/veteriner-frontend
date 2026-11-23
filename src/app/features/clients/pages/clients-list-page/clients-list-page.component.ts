import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Paginator } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { ListPageState } from '@/app/shared/list/list-page-state';
import type { ClientListItemVm } from '@/app/entities/client/models/client-vm.model';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import { AppListEmptyStateComponent } from '@/app/shared/ui/empty-state/app-list-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { AppPhoneListComponent, type PhoneListAction, type PhoneListItem } from '@/app/shared/ui/phone-list/app-phone-list.component';
import { formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLIENTS_CREATE_CLAIM, CLIENTS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';
import { TrDatePipe } from '@/app/shared/pipes/tr-date.pipe';
import { formatUtcIsoAsLocalDateDisplay } from '@/app/shared/utils/date.utils';
import { RowLinkDirective } from '@/app/shared/ui/row-link/row-link.directive';

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
        RowLinkDirective,
        CommonModule,
        FormsModule,
        RouterLink,
        TableModule,
        Paginator,
        ButtonModule,
        InputTextModule,
        AppListHeaderComponent,
        AppPhoneListComponent,
        AppLoadingStateComponent,
        AppListEmptyStateComponent,
        AppErrorStateComponent,
        FilterFieldComponent,
        SearchInputComponent,
        AppRowActionButtonComponent,
        TrDatePipe
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card">
            <div class="flex flex-col gap-4">
                <app-list-header class="pb-3 border-b border-surface-200 dark:border-surface-700" title="Müşteriler" [count]="totalItems()">
                    <app-filter-field label="Arama" labelFor="clientSearch" [active]="isSearchActive()" width="grow">
                        <app-search-input inputId="clientSearch" hint="Ad, e-posta, telefon" [(value)]="searchInput" (searchRequested)="applySearch()" />
                    </app-filter-field>
                    <button pButton type="button" actions severity="secondary" (click)="resetFilters()" [disabled]="loading()"><i class="p-button-icon pi pi-times"></i>{{ copy.buttonClear }}</button>
                    @if (canCreateClient && !ro.mutationBlocked()) {
                        <a actions routerLink="/panel/clients/new" pButton type="button" class="p-button-primary"><i class="pi pi-plus"></i>Yeni müşteri</a>
                    } @else if (canCreateClient && ro.mutationBlocked()) {
                        <button actions pButton type="button" [disabled]="true" class="p-button-secondary"><i class="pi pi-lock"></i>Yeni müşteri (salt okunur)</button>
                    }
                </app-list-header>
                @if (error()) {
                    <app-error-state [detail]="error()!" (retry)="reload()" />
                } @else if (initialLoad() && loading()) {
                    <app-loading-state message="Müşteri listesi yükleniyor…" />
                } @else {
                    @if (displayedRows().length === 0) {
                        <app-list-empty-state [filtered]="isSearchActive()" emptyMessage="Henüz müşteri yok." [createLabel]="canCreateClient && !ro.mutationBlocked() ? 'İlk müşteriyi ekle' : null" [createLink]="'/panel/clients/new'" (clear)="resetFilters()" />
                    } @else {
                        <div class="hidden lg:block list-table">
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
                                (onLazyLoad)="list.onTableLazyLoad($event)"
                                [tableStyle]="{ 'min-width': '50rem' }"
                                [showCurrentPageReport]="true"
                                currentPageReportTemplate="{first} - {last} / {totalRecords}"
                            >
                                <ng-template #header>
                                    <tr>
                                        <th>Ad soyad</th>
                                        <th>Telefon</th>
                                        <th>E-posta</th>
                                        <th>Kayıt tarihi</th>
                                        <th style="width: 8rem">İşlemler</th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-row>
                                    <tr [appRowLink]="['/panel/clients', row.id]">
                                        <td class="font-medium"><a [routerLink]="['/panel/clients', row.id]" class="text-primary no-underline">{{ row.fullName }}</a></td>
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

                        <!-- Telefonda ortak gün başlıklı satır listesi (G-04): dokununca dolu alanlar ve yazılı eylemler açılır. -->
                        <app-phone-list class="lg:hidden" [items]="phoneItems()" />

                        <div class="lg:hidden mt-4">
                            <p-paginator
                                [rows]="pageSize()"
                                [totalRecords]="totalItems()"
                                [first]="first()"
                                [showCurrentPageReport]="true"
                                currentPageReportTemplate="{first} - {last} / {totalRecords}"
                                [rowsPerPageOptions]="rowsPerPageOptions"
                                (onPageChange)="list.onMobilePageChange($event)"
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

    readonly list = new ListPageState<ClientListItemVm>({
        fetch: (page, pageSize) => this.clientsService.getClients({ page, pageSize, search: this.activeSearch() || undefined }),
        loadKey: (page, pageSize) => `${page}|${pageSize}|${this.activeSearch().trim()}`,
        persist: {
            key: CLIENTS_LIST_STATE_KEY,
            save: (): Omit<ClientsListState, 'page' | 'pageSize'> => ({ search: this.searchInput.trim() }),
            restore: (state) => {
                const parsed = state as Partial<ClientsListState>;

                this.searchInput = typeof parsed.search === 'string' ? parsed.search : '';
                this.activeSearch.set(this.searchInput.trim());
            }
        },
        onLoaded: () => this.initialLoad.set(false)
    });

    readonly rowsPerPageOptions = this.list.rowsPerPageOptions;
    readonly loading = this.list.loading;
    readonly initialLoad = signal(true);
    readonly error = this.list.error;

    readonly rawItems = this.list.items;
    readonly totalItems = this.list.totalItems;
    readonly pageSize = this.list.pageSize;
    readonly first = this.list.first;
    readonly currentPage = this.list.currentPage;

    readonly activeSearch = signal('');
    searchInput = '';

    readonly displayedRows = computed(() => this.rawItems());

    /** Telefon satırları (G-04): ad ve telefon (yoksa e-posta); açılınca dolu alanlar, boş alan yazılmaz. */
    readonly phoneItems = computed<PhoneListItem[]>(() =>
        this.displayedRows().map((row) => {
            const phone = row.phone ? formatClientPhoneForDisplay(row.phone) : null;
            const actions: PhoneListAction[] = this.canUpdateClient && !this.ro.mutationBlocked() ? [{ label: 'Düzenle', icon: 'pi pi-pencil', link: ['/panel/clients', row.id, 'edit'] }] : [];

            return {
                id: row.id,
                title: row.fullName,
                sub: phone || row.email,
                fields: [
                    { label: 'Telefon', value: phone },
                    { label: 'E-posta', value: row.email },
                    { label: 'Kayıt', value: row.createdAtUtc ? formatUtcIsoAsLocalDateDisplay(row.createdAtUtc) : null }
                ],
                detailLink: ['/panel/clients', row.id],
                actions
            };
        })
    );    readonly canCreateClient = this.auth.hasOperationClaim(CLIENTS_CREATE_CLAIM);
    readonly canUpdateClient = this.auth.hasOperationClaim(CLIENTS_UPDATE_CLAIM);

    ngOnInit(): void {
        if (!this.list.restore()) {
            this.list.goToFirstPage();
        }

        this.list.startInitialLoad();
    }

    applySearch(): void {
        this.activeSearch.set(this.searchInput.trim());
        this.list.suppressNextTableLoad();
        this.list.loadFirstPage();
    }

    resetFilters(): void {
        this.searchInput = '';
        this.activeSearch.set('');
        this.list.suppressNextTableLoad();
        this.list.resetToFirstPage();
    }

    reload(): void {
        this.list.suppressNextTableLoad();
        this.list.reload();
    }

    isSearchActive(): boolean {
        return !!this.activeSearch().trim();
    }

}
