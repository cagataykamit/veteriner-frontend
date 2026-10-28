import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Paginator } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { ListPageState } from '@/app/shared/list/list-page-state';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '@/app/core/auth/auth.service';
import { TENANT_MANAGEMENT_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { TenantMemberListItemVm } from '@/app/features/tenant-members/models/tenant-members-vm.model';
import { TenantMembersService } from '@/app/features/tenant-members/services/tenant-members.service';
import { TenantMemberRemoveDialogComponent } from '@/app/features/tenant-members/components/tenant-member-remove-dialog.component';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

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
        AppErrorStateComponent,
        SearchInputComponent,
        AppRowActionButtonComponent,
        ToastModule,
        TenantMemberRemoveDialogComponent,
        TrDateTimePipe
    ],
    providers: [MessageService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-toast position="bottom-right" />
        <app-page-header title="Kurum üyeleri" description="Bu kuruma bağlı kullanıcıların salt okunur listesi.">
            @if (canManageTenantAccess()) {
                <a actions routerLink="/panel/settings/members/role-permission-matrix" pButton type="button" class="p-button-secondary p-button-outlined"><i class="pi pi-table"></i>{{ copy.tenantRoleMatrixTitle }}</a>
            }
        </app-page-header>

        <div class="card">
            @if (loading()) {
                <app-loading-state message="Üye listesi yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else {
                <div class="flex flex-col gap-4">
                    <div class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3 pb-3 border-b border-surface-200 dark:border-surface-700">
                        <div class="min-w-0">
                            <h5 class="m-0">Üyeler</h5>
                            @if (totalItems() > 0) {
                                <span class="text-sm text-muted-color whitespace-nowrap">{{ totalItems() }} kayıt</span>
                            }
                        </div>
                        <div class="flex flex-col sm:flex-row gap-3 sm:items-end w-full xl:w-auto xl:min-w-[22rem] xl:max-w-2xl">
                            <div class="flex-1 min-w-0">
                                <label for="tmSearch" class="block text-xs font-medium text-muted-color mb-1">Arama</label>
                                <app-search-input inputId="tmSearch" placeholder="E-posta…" [(value)]="searchInput" (searchRequested)="applySearch()" />
                            </div>
                            <div class="flex flex-wrap gap-2 shrink-0">
                                <button pButton type="button" severity="secondary" (click)="resetFilters()" [disabled]="loading()"><i class="p-button-icon pi pi-times"></i>{{ copy.buttonClear }}</button>
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
                                [rowsPerPageOptions]="rowsPerPageOptions"
                                [paginatorDropdownAppendTo]="'body'"
                                [totalRecords]="totalItems()"
                                [lazy]="true"
                                [first]="first()"
                                (onLazyLoad)="list.onTableLazyLoad($event)"
                                [tableStyle]="{ 'min-width': '48rem' }"
                                [showCurrentPageReport]="true"
                                currentPageReportTemplate="{first} - {last} / {totalRecords}"
                            >
                                <ng-template #header>
                                    <tr>
                                        <th>E-posta</th>
                                        <th>E-posta onayı</th>
                                        <th>Oluşturulma</th>
                                        <th style="width: 6rem">İşlemler</th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-row>
                                    <tr>
                                        <td class="font-medium break-all">{{ row.email }}</td>
                                        <td>{{ formatConfirmed(row.emailConfirmed) }}</td>
                                        <td>{{ row.createdAtUtc | trDateTime }}</td>
                                        <td>
                                            <div class="flex items-center gap-1">
                                                <app-row-action-button action="detail" [link]="['/panel/settings/members', row.id]" />
                                                @if (canRemoveRow(row)) {
                                                    <app-row-action-button action="delete" label="Kurumdan çıkar" (pressed)="openRemove(row)" />
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
                                    <div class="text-sm font-medium text-surface-900 dark:text-surface-0 min-w-0 mb-2 break-all">
                                        {{ row.email }}
                                    </div>
                                    <div class="space-y-2 text-sm min-w-0">
                                        <div>
                                            <span class="text-muted-color font-medium">E-posta onayı: </span>
                                            {{ formatConfirmed(row.emailConfirmed) }}
                                        </div>
                                        @if (row.createdAtUtc) {
                                            <div class="text-xs text-muted-color">Oluşturulma: {{ row.createdAtUtc | trDateTime }}</div>
                                        }
                                    </div>
                                    <div class="flex justify-end items-center gap-1 pt-2 border-t border-surface-200 dark:border-surface-700">
                                        <app-row-action-button action="detail" [link]="['/panel/settings/members', row.id]" />
                                        @if (canRemoveRow(row)) {
                                            <app-row-action-button action="delete" label="Kurumdan çıkar" (pressed)="openRemove(row)" />
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
                                (onPageChange)="list.onMobilePageChange($event)"
                            />
                        </div>
                    }
                </div>
            }
        </div>

        <app-tenant-member-remove-dialog [(visible)]="removeOpen" [member]="removeTarget()" (removed)="onMemberRemoved()" />
    `
})
export class TenantMembersListPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly auth = inject(AuthService);
    private readonly ro = inject(TenantReadOnlyContextService);
    private readonly tenantMembers = inject(TenantMembersService);
    private readonly messages = inject(MessageService);
    private readonly router = inject(Router);

    /** Davet/üye yönetimi: `Tenants.InviteCreate` ve salt okunur değil. */
    readonly canManageTenantAccess = computed(() => this.auth.hasOperationClaim(TENANT_MANAGEMENT_CLAIM) && !this.ro.mutationBlocked());

    /** Üye detayındaki "Üyeyi kurumdan çıkar" koşulu: yönetim yetkisi, salt okunur değil, kendi hesabı değil. */
    canRemoveRow(row: TenantMemberListItemVm): boolean {
        return this.canManageTenantAccess() && row.id.toLowerCase() !== this.auth.getUserId()?.toLowerCase();
    }

    /** Çıkarma diyaloğunun açık olduğu satır. */
    readonly removeTarget = signal<TenantMemberListItemVm | null>(null);
    readonly removeOpen = signal(false);

    openRemove(row: TenantMemberListItemVm): void {
        this.removeTarget.set(row);
        this.removeOpen.set(true);
    }

    onMemberRemoved(): void {
        addTracedToast(this.messages, 'TenantMembersListPage', this.router.url, {
            severity: 'success',
            summary: 'Tamam',
            detail: 'Üye kurumdan çıkarıldı.'
        });
        this.reload();
    }

    readonly list = new ListPageState<TenantMemberListItemVm>({
        fetch: (page, pageSize) =>
            this.tenantMembers
                .getMembers({
                    page,
                    pageSize,
                    search: this.activeSearch() || undefined
                }),
        loadKey: (page, pageSize) => `${page}|${pageSize}|${this.activeSearch().trim()}`
    });

    readonly loading = this.list.loading;
    readonly error = this.list.error;

    readonly rawItems = this.list.items;
    readonly totalItems = this.list.totalItems;
    readonly rowsPerPageOptions = this.list.rowsPerPageOptions;
    readonly pageSize = this.list.pageSize;
    readonly first = this.list.first;
    readonly currentPage = this.list.currentPage;

    readonly activeSearch = signal('');
    searchInput = '';

    readonly displayedRows = computed(() => this.rawItems());

    formatConfirmed(v: boolean | null): string {
        if (v === true) {
            return 'Evet';
        }

        if (v === false) {
            return 'Hayır';
        }

        return '—';
    }

    ngOnInit(): void {
        this.list.startInitialLoad();
    }

    applySearch(): void {
        this.activeSearch.set(this.searchInput.trim());
        this.list.loadFirstPage();
    }

    resetFilters(): void {
        this.searchInput = '';
        this.activeSearch.set('');
        this.list.loadFirstPage();
    }

    reload(): void {
        this.list.reload();
    }

}
