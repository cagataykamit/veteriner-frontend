import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '@/app/core/auth/auth.service';
import { TENANT_MANAGEMENT_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Paginator } from 'primeng/paginator';
import { TableModule } from 'primeng/table';
import { ListPageState } from '@/app/shared/list/list-page-state';
import type { TenantInviteListItemVm } from '@/app/entities/tenant-invite/models/tenant-invite-vm.model';
import { TenantInvitesService } from '@/app/entities/tenant-invite/services/tenant-invites.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { tenantInviteDisplayStatusSeverity } from '@/app/entities/tenant-invite/utils/tenant-invite-status.utils';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

@Component({
    selector: 'app-tenant-invite-list-page',
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
        AppStatusTagComponent,
        SearchInputComponent,
        AppRowActionButtonComponent,
        TrDateTimePipe
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-page-header title="Davetler" description="Kurum davetlerinin listesi. Yeni davet için oluşturma ekranını kullanın.">
            @if (canManageTenantAccess()) {
                <a actions routerLink="/panel/settings/invites" pButton type="button" class="p-button-primary"><i class="pi pi-plus"></i>Davet oluştur</a>
            }
        </app-page-header>

        <div class="card">
            @if (loading()) {
                <app-loading-state message="Davet listesi yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else {
                <div class="flex flex-col gap-4">
                    <div class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3 pb-3 border-b border-surface-200 dark:border-surface-700">
                        <div class="min-w-0">
                            <h5 class="m-0">Davetler</h5>
                            @if (totalItems() > 0) {
                                <span class="text-sm text-muted-color whitespace-nowrap">{{ totalItems() }} kayıt</span>
                            }
                        </div>
                        <div class="flex flex-col sm:flex-row gap-3 sm:items-end w-full xl:w-auto xl:min-w-[22rem] xl:max-w-2xl">
                            <div class="flex-1 min-w-0">
                                <label for="tiSearch" class="block text-xs font-medium text-muted-color mb-1">Arama</label>
                                <app-search-input inputId="tiSearch" placeholder="E-posta…" [(value)]="searchInput" (searchRequested)="applySearch()" />
                            </div>
                            <div class="flex flex-wrap gap-2 shrink-0">
                                <button pButton type="button" severity="secondary" (click)="resetFilters()" [disabled]="loading()"><i class="p-button-icon pi pi-times"></i>{{ copy.buttonClear }}</button>
                            </div>
                        </div>
                    </div>
                    @if (actionError()) {
                        <p class="text-red-500 text-sm m-0" role="alert">{{ actionError() }}</p>
                    }
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
                                [tableStyle]="{ 'min-width': '58rem' }"
                                [showCurrentPageReport]="true"
                                currentPageReportTemplate="{first} - {last} / {totalRecords}"
                            >
                                <ng-template #header>
                                    <tr>
                                        <th>E-posta</th>
                                        <th>Durum</th>
                                        <th>Son geçerlilik</th>
                                        <th>Klinik</th>
                                        <th>Rol</th>
                                        <th style="min-width: 14rem">İşlemler</th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-row>
                                    <tr>
                                        <td class="font-medium break-all">{{ row.email }}</td>
                                        <td>
                                            <app-status-tag [label]="row.statusLabel" [severity]="inviteStatusSeverity(row)" />
                                        </td>
                                        <td>{{ row.expiresAtUtc | trDateTime }}</td>
                                        <td class="break-words">{{ row.clinicSummary }}</td>
                                        <td class="break-words">{{ row.roleSummary }}</td>
                                        <td>
                                            <div class="flex flex-wrap gap-1 items-center">
                                                <app-row-action-button action="detail" [link]="['/panel/settings/invites', row.id]" />
                                                @if (row.canCancel && canManageTenantAccess()) {
                                                    <app-row-action-button action="void" [loading]="isRowBusy(row.id, 'cancel')" [disabled]="anyRowBusy() && !isRowBusy(row.id, 'cancel')" (pressed)="onCancelInvite(row.id)" />
                                                }
                                                @if (row.canResend && canManageTenantAccess()) {
                                                    <button
                                                        pButton
                                                        type="button"
                                                        class="p-button-sm p-button-text"
                                                        [disabled]="anyRowBusy() && !isRowBusy(row.id, 'resend') || isRowBusy(row.id, 'resend')"
                                                        (click)="onResendInvite(row.id)"
                                                    ><i class="p-button-icon" [class]="isRowBusy(row.id, 'resend') ? 'pi pi-spin pi-spinner' : 'pi pi-send'"></i>Yeniden gönder</button>
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
                                        <div class="flex flex-wrap items-center gap-2">
                                            <span class="text-muted-color font-medium">Durum:</span>
                                            <app-status-tag [label]="row.statusLabel" [severity]="inviteStatusSeverity(row)" />
                                        </div>
                                        <div><span class="text-muted-color font-medium">Klinik: </span>{{ row.clinicSummary }}</div>
                                        <div><span class="text-muted-color font-medium">Rol: </span>{{ row.roleSummary }}</div>
                                        @if (row.expiresAtUtc) {
                                            <div class="text-xs text-muted-color">Son geçerlilik: {{ row.expiresAtUtc | trDateTime }}</div>
                                        }
                                    </div>
                                    <div class="flex flex-wrap gap-1 items-center justify-end pt-2 border-t border-surface-200 dark:border-surface-700">
                                        <app-row-action-button action="detail" [link]="['/panel/settings/invites', row.id]" />
                                        @if (row.canCancel && canManageTenantAccess()) {
                                            <app-row-action-button action="void" [loading]="isRowBusy(row.id, 'cancel')" [disabled]="anyRowBusy() && !isRowBusy(row.id, 'cancel')" (pressed)="onCancelInvite(row.id)" />
                                        }
                                        @if (row.canResend && canManageTenantAccess()) {
                                            <button
                                                pButton
                                                type="button"
                                                class="p-button-sm p-button-text"
                                                [disabled]="anyRowBusy() && !isRowBusy(row.id, 'resend') || isRowBusy(row.id, 'resend')"
                                                (click)="onResendInvite(row.id)"
                                            ><i class="p-button-icon" [class]="isRowBusy(row.id, 'resend') ? 'pi pi-spin pi-spinner' : 'pi pi-send'"></i>Yeniden gönder</button>
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
    `
})
export class TenantInviteListPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    readonly inviteStatusSeverity = (row: TenantInviteListItemVm) => tenantInviteDisplayStatusSeverity(row.statusLifecycle, row.isCurrentMember);

    private readonly auth = inject(AuthService);
    private readonly tenantInvites = inject(TenantInvitesService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canManageTenantAccess = computed(() => this.auth.hasOperationClaim(TENANT_MANAGEMENT_CLAIM) && !this.ro.mutationBlocked());

    readonly list = new ListPageState<TenantInviteListItemVm>({
        fetch: (page, pageSize) =>
            this.tenantInvites
                .getInvitesList({
                    page,
                    pageSize,
                    search: this.activeSearch() || undefined
                }),
        loadKey: (page, pageSize) => `${page}|${pageSize}|${this.activeSearch().trim()}`
    });

    readonly loading = this.list.loading;
    readonly error = this.list.error;
    readonly actionError = signal<string | null>(null);
    readonly actionBusy = signal<{ id: string; kind: 'cancel' | 'resend' } | null>(null);

    readonly rawItems = this.list.items;
    readonly totalItems = this.list.totalItems;
    readonly rowsPerPageOptions = this.list.rowsPerPageOptions;
    readonly pageSize = this.list.pageSize;
    readonly first = this.list.first;
    readonly currentPage = this.list.currentPage;

    readonly activeSearch = signal('');
    searchInput = '';

    readonly displayedRows = computed(() => this.rawItems());

    ngOnInit(): void {
        this.list.startInitialLoad();
    }

    applySearch(): void {
        this.actionError.set(null);
        this.activeSearch.set(this.searchInput.trim());
        this.list.loadFirstPage();
    }

    resetFilters(): void {
        this.actionError.set(null);
        this.searchInput = '';
        this.activeSearch.set('');
        this.list.loadFirstPage();
    }

    reload(): void {
        this.actionError.set(null);
        this.list.reload();
    }

    isRowBusy(rowId: string, kind: 'cancel' | 'resend'): boolean {
        const b = this.actionBusy();

        return b?.id === rowId && b?.kind === kind;
    }

    anyRowBusy(): boolean {
        return this.actionBusy() !== null;
    }

    onCancelInvite(id: string): void {
        if (!this.canManageTenantAccess()) {
            return;
        }

        this.actionError.set(null);
        this.actionBusy.set({ id, kind: 'cancel' });
        this.tenantInvites.cancelInvite(id).subscribe({
            next: () => {
                this.actionBusy.set(null);
                this.reloadCurrent();
            },
            error: (e: Error) => {
                this.actionBusy.set(null);
                this.actionError.set(panelHttpFailureMessage(e, 'İptal başarısız.'));
            }
        });
    }

    onResendInvite(id: string): void {
        if (!this.canManageTenantAccess()) {
            return;
        }

        this.actionError.set(null);
        this.actionBusy.set({ id, kind: 'resend' });
        this.tenantInvites.resendInvite(id).subscribe({
            next: () => {
                this.actionBusy.set(null);
                this.reloadCurrent();
            },
            error: (e: Error) => {
                this.actionBusy.set(null);
                this.actionError.set(panelHttpFailureMessage(e, 'Yeniden gönderim başarısız.'));
            }
        });
    }

    private reloadCurrent(): void {
        this.list.reload();
    }

}
