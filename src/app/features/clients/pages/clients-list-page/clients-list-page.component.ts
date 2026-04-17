import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatDateDisplay } from '@/app/shared/utils/date.utils';
import { formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';

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
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent
    ],
    template: `
        <app-page-header title="Müşteriler" subtitle="Hasta yönetimi" description="Kayıtlı müşteri listesi ve detay.">
            @if (!ro.mutationBlocked()) {
                <a actions routerLink="/panel/clients/new" pButton type="button" label="Yeni Müşteri" icon="pi pi-plus" class="p-button-primary"></a>
            } @else {
                <button
                    actions
                    pButton
                    type="button"
                    label="Yeni Müşteri (salt okunur)"
                    icon="pi pi-lock"
                    [disabled]="true"
                    class="p-button-secondary"
                ></button>
            }
        </app-page-header>

        <div class="card">
            @if (loading()) {
                <app-loading-state message="Müşteri listesi yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else {
                <div class="flex flex-col gap-4">
                    <div
                        class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3 pb-3 border-b border-surface-200 dark:border-surface-700"
                    >
                        <div class="min-w-0">
                            <h5 class="m-0">Müşteriler</h5>
                            @if (totalItems() > 0) {
                                <span class="text-sm text-muted-color whitespace-nowrap">{{ totalItems() }} kayıt</span>
                            }
                        </div>
                        <div class="flex flex-col sm:flex-row gap-3 sm:items-end w-full xl:w-auto xl:min-w-[22rem] xl:max-w-2xl">
                            <div class="flex-1 min-w-0">
                                <label for="clientSearch" class="block text-xs font-medium text-muted-color mb-1">Arama</label>
                                <input
                                    pInputText
                                    id="clientSearch"
                                    class="w-full"
                                    [(ngModel)]="searchInput"
                                    placeholder="Ad, e-posta, telefon…"
                                    (keyup.enter)="applySearch()"
                                />
                            </div>
                            <div class="flex flex-wrap gap-2 shrink-0">
                                <p-button [label]="copy.buttonSearch" icon="pi pi-search" (onClick)="applySearch()" [disabled]="loading()" />
                                <p-button [label]="copy.buttonClear" icon="pi pi-times" severity="secondary" (onClick)="resetFilters()" [disabled]="loading()" />
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
                                    <td>{{ formatDate(row.createdAtUtc) }}</td>
                                    <td>
                                        <a [routerLink]="['/panel/clients', row.id]" class="text-primary font-medium no-underline">Detay</a>
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
                                    <div class="text-xs text-muted-color mb-3 min-w-0">Kayıt: {{ formatDate(row.createdAtUtc) }}</div>
                                }
                                <div class="flex justify-end pt-1 border-t border-surface-200 dark:border-surface-700">
                                    <a [routerLink]="['/panel/clients', row.id]" class="text-primary font-medium no-underline">Detay →</a>
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
export class ClientsListPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    readonly formatClientPhoneForDisplay = formatClientPhoneForDisplay;
    readonly ro = inject(TenantReadOnlyContextService);

    private readonly clientsService = inject(ClientsService);

    /** İlk yüklemede boş tablo flaşını önlemek için true başlar. */
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);

    readonly rawItems = signal<ClientListItemVm[]>([]);
    readonly totalItems = signal(0);
    readonly pageSize = signal(10);
    readonly first = signal(0);
    readonly currentPage = signal(1);

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

    onMobilePageChange(state: PaginatorState): void {
        const rows = state.rows ?? this.pageSize();
        const first = state.first ?? 0;
        const page = Math.floor(first / rows) + 1;
        this.suppressNextLazy = true;
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
