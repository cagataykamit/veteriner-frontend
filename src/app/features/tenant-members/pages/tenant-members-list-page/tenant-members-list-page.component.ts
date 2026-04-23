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
import type { TenantMemberListItemVm } from '@/app/features/tenant-members/models/tenant-members-vm.model';
import { TenantMembersService } from '@/app/features/tenant-members/services/tenant-members.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';

@Component({
    selector: 'app-tenant-members-list-page',
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
        <app-page-header
            title="Kurum üyeleri"
            subtitle="Hesap"
            description="Bu kuruma bağlı kullanıcıların salt okunur listesi."
        >
            <a
                actions
                routerLink="/panel/settings/members/role-permission-matrix"
                pButton
                type="button"
                [label]="copy.tenantRoleMatrixTitle"
                icon="pi pi-table"
                class="p-button-secondary p-button-outlined"
            ></a>
        </app-page-header>

        <div class="card">
            @if (loading()) {
                <app-loading-state message="Üye listesi yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else {
                <div class="flex flex-col gap-4">
                    <div
                        class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3 pb-3 border-b border-surface-200 dark:border-surface-700"
                    >
                        <div class="min-w-0">
                            <h5 class="m-0">Üyeler</h5>
                            @if (totalItems() > 0) {
                                <span class="text-sm text-muted-color whitespace-nowrap">{{ totalItems() }} kayıt</span>
                            }
                        </div>
                        <div class="flex flex-col sm:flex-row gap-3 sm:items-end w-full xl:w-auto xl:min-w-[22rem] xl:max-w-2xl">
                            <div class="flex-1 min-w-0">
                                <label for="tmSearch" class="block text-xs font-medium text-muted-color mb-1">Arama</label>
                                <input
                                    pInputText
                                    id="tmSearch"
                                    class="w-full"
                                    [(ngModel)]="searchInput"
                                    placeholder="E-posta…"
                                    (keyup.enter)="applySearch()"
                                />
                            </div>
                            <div class="flex flex-wrap gap-2 shrink-0">
                                <p-button [label]="copy.buttonSearch" icon="pi pi-search" (onClick)="applySearch()" [disabled]="loading()" />
                                <p-button
                                    [label]="copy.buttonClear"
                                    icon="pi pi-times"
                                    severity="secondary"
                                    (onClick)="resetFilters()"
                                    [disabled]="loading()"
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
                                [tableStyle]="{ 'min-width': '48rem' }"
                                [showCurrentPageReport]="true"
                                currentPageReportTemplate="{first} - {last} / {totalRecords}"
                            >
                                <ng-template #header>
                                    <tr>
                                        <th>E-posta</th>
                                        <th>E-posta onayı</th>
                                        <th>Oluşturulma</th>
                                        <th style="width: 8rem">İşlemler</th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-row>
                                    <tr>
                                        <td class="font-medium break-all">{{ row.email }}</td>
                                        <td>{{ formatConfirmed(row.emailConfirmed) }}</td>
                                        <td>{{ formatDate(row.createdAtUtc) }}</td>
                                        <td>
                                            <a
                                                [routerLink]="['/panel/settings/members', row.id]"
                                                pButton
                                                type="button"
                                                class="p-button-text p-button-sm"
                                                label="Detay"
                                                icon="pi pi-eye"
                                            ></a>
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
                                    <div class="text-sm font-medium text-surface-900 dark:text-surface-0 min-w-0 mb-2 break-all">
                                        {{ row.email }}
                                    </div>
                                    <div class="space-y-2 text-sm min-w-0">
                                        <div>
                                            <span class="text-muted-color font-medium">E-posta onayı: </span>
                                            {{ formatConfirmed(row.emailConfirmed) }}
                                        </div>
                                        @if (row.createdAtUtc) {
                                            <div class="text-xs text-muted-color">Oluşturulma: {{ formatDate(row.createdAtUtc) }}</div>
                                        }
                                    </div>
                                    <div class="flex justify-end pt-2 border-t border-surface-200 dark:border-surface-700">
                                        <a
                                            [routerLink]="['/panel/settings/members', row.id]"
                                            pButton
                                            type="button"
                                            class="p-button-text p-button-sm"
                                            label="Detay →"
                                            icon="pi pi-eye"
                                        ></a>
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
export class TenantMembersListPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly tenantMembers = inject(TenantMembersService);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);

    readonly rawItems = signal<TenantMemberListItemVm[]>([]);
    readonly totalItems = signal(0);
    readonly pageSize = signal(10);
    readonly first = signal(0);
    readonly currentPage = signal(1);

    readonly activeSearch = signal('');
    searchInput = '';

    readonly displayedRows = computed(() => this.rawItems());

    readonly formatDate = (v: string | null) => formatDateTimeDisplay(v);

    formatConfirmed(v: boolean | null): string {
        if (v === true) {
            return 'Evet';
        }
        if (v === false) {
            return 'Hayır';
        }
        return '—';
    }

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
        this.tenantMembers
            .getMembers({
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
