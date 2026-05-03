import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuthService } from '@/app/core/auth/auth.service';
import { TENANT_MANAGEMENT_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Paginator } from 'primeng/paginator';
import type { PaginatorState } from 'primeng/types/paginator';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import type { TenantInviteListItemVm } from '@/app/features/tenant-invites/models/tenant-invite-vm.model';
import { TenantInvitesService } from '@/app/features/tenant-invites/services/tenant-invites.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { tenantInviteStatusTagSeverity } from '@/app/features/tenant-invites/utils/tenant-invite-status.utils';

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
        AppStatusTagComponent
    ],
    template: `
        <app-page-header title="Davetler" subtitle="Hesap" description="Kurum davetlerinin listesi. Yeni davet için oluşturma ekranını kullanın.">
            @if (canManageTenantAccess()) {
                <a actions routerLink="/panel/settings/invites" pButton type="button" label="Davet oluştur" icon="pi pi-plus" class="p-button-primary"></a>
            }
        </app-page-header>

        <div class="card">
            @if (loading()) {
                <app-loading-state message="Davet listesi yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else {
                <div class="flex flex-col gap-4">
                    <div
                        class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3 pb-3 border-b border-surface-200 dark:border-surface-700"
                    >
                        <div class="min-w-0">
                            <h5 class="m-0">Davetler</h5>
                            @if (totalItems() > 0) {
                                <span class="text-sm text-muted-color whitespace-nowrap">{{ totalItems() }} kayıt</span>
                            }
                        </div>
                        <div class="flex flex-col sm:flex-row gap-3 sm:items-end w-full xl:w-auto xl:min-w-[22rem] xl:max-w-2xl">
                            <div class="flex-1 min-w-0">
                                <label for="tiSearch" class="block text-xs font-medium text-muted-color mb-1">Arama</label>
                                <input
                                    pInputText
                                    id="tiSearch"
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
                                [totalRecords]="totalItems()"
                                [lazy]="true"
                                [first]="first()"
                                (onLazyLoad)="onTableLazyLoad($event)"
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
                                        <td>{{ formatDate(row.expiresAtUtc) }}</td>
                                        <td class="break-words">{{ row.clinicSummary }}</td>
                                        <td class="break-words">{{ row.roleSummary }}</td>
                                        <td>
                                            <div class="flex flex-wrap gap-2 align-items-center">
                                                <a
                                                    [routerLink]="['/panel/settings/invites', row.id]"
                                                    pButton
                                                    type="button"
                                                    class="p-button-text p-button-sm"
                                                    label="Detay"
                                                    icon="pi pi-eye"
                                                ></a>
                                                @if (row.canCancel && canManageTenantAccess()) {
                                                    <p-button
                                                        type="button"
                                                        label="İptal"
                                                        icon="pi pi-times"
                                                        severity="danger"
                                                        styleClass="p-button-sm p-button-text"
                                                        [loading]="isRowBusy(row.id, 'cancel')"
                                                        [disabled]="anyRowBusy() && !isRowBusy(row.id, 'cancel')"
                                                        (onClick)="onCancelInvite(row.id)"
                                                    />
                                                }
                                                @if (row.canResend && canManageTenantAccess()) {
                                                    <p-button
                                                        type="button"
                                                        label="Yeniden gönder"
                                                        icon="pi pi-send"
                                                        styleClass="p-button-sm p-button-text"
                                                        [loading]="isRowBusy(row.id, 'resend')"
                                                        [disabled]="anyRowBusy() && !isRowBusy(row.id, 'resend')"
                                                        (onClick)="onResendInvite(row.id)"
                                                    />
                                                }
                                            </div>
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
                                        <div class="flex flex-wrap items-center gap-2">
                                            <span class="text-muted-color font-medium">Durum:</span>
                                            <app-status-tag [label]="row.statusLabel" [severity]="inviteStatusSeverity(row)" />
                                        </div>
                                        <div><span class="text-muted-color font-medium">Klinik: </span>{{ row.clinicSummary }}</div>
                                        <div><span class="text-muted-color font-medium">Rol: </span>{{ row.roleSummary }}</div>
                                        @if (row.expiresAtUtc) {
                                            <div class="text-xs text-muted-color">Son geçerlilik: {{ formatDate(row.expiresAtUtc) }}</div>
                                        }
                                    </div>
                                    <div class="flex flex-wrap gap-2 justify-end pt-2 border-t border-surface-200 dark:border-surface-700">
                                        <a
                                            [routerLink]="['/panel/settings/invites', row.id]"
                                            pButton
                                            type="button"
                                            class="p-button-text p-button-sm"
                                            label="Detay"
                                            icon="pi pi-eye"
                                        ></a>
                                        @if (row.canCancel && canManageTenantAccess()) {
                                            <p-button
                                                type="button"
                                                label="İptal"
                                                icon="pi pi-times"
                                                severity="danger"
                                                styleClass="p-button-sm p-button-text"
                                                [loading]="isRowBusy(row.id, 'cancel')"
                                                [disabled]="anyRowBusy() && !isRowBusy(row.id, 'cancel')"
                                                (onClick)="onCancelInvite(row.id)"
                                            />
                                        }
                                        @if (row.canResend && canManageTenantAccess()) {
                                            <p-button
                                                type="button"
                                                label="Yeniden gönder"
                                                icon="pi pi-send"
                                                styleClass="p-button-sm p-button-text"
                                                [loading]="isRowBusy(row.id, 'resend')"
                                                [disabled]="anyRowBusy() && !isRowBusy(row.id, 'resend')"
                                                (onClick)="onResendInvite(row.id)"
                                            />
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
export class TenantInviteListPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    readonly inviteStatusSeverity = (row: TenantInviteListItemVm) => tenantInviteStatusTagSeverity(row.statusLifecycle);

    private readonly auth = inject(AuthService);
    private readonly tenantInvites = inject(TenantInvitesService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canManageTenantAccess = computed(
        () => this.auth.hasOperationClaim(TENANT_MANAGEMENT_CLAIM) && !this.ro.mutationBlocked()
    );

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly actionError = signal<string | null>(null);
    readonly actionBusy = signal<{ id: string; kind: 'cancel' | 'resend' } | null>(null);

    readonly rawItems = signal<TenantInviteListItemVm[]>([]);
    readonly totalItems = signal(0);
    readonly pageSize = signal(10);
    readonly first = signal(0);
    readonly currentPage = signal(1);

    readonly activeSearch = signal('');
    searchInput = '';

    readonly displayedRows = computed(() => this.rawItems());

    readonly formatDate = (v: string | null) => formatDateTimeDisplay(v);

    private suppressNextLazy = false;
    private lastLoadKey = '';

    ngOnInit(): void {
        this.suppressNextLazy = true;
        this.loadFromServer(1, this.pageSize(), this.activeSearch());
    }

    applySearch(): void {
        this.actionError.set(null);
        this.activeSearch.set(this.searchInput.trim());
        this.first.set(0);
        this.loadFromServer(1, this.pageSize(), this.activeSearch());
    }

    resetFilters(): void {
        this.actionError.set(null);
        this.searchInput = '';
        this.activeSearch.set('');
        this.first.set(0);
        this.loadFromServer(1, this.pageSize(), '');
    }

    reload(): void {
        this.actionError.set(null);
        this.loadFromServer(this.currentPage(), this.pageSize(), this.activeSearch(), true);
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
                this.actionError.set(e.message ?? 'İptal başarısız.');
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
                this.actionError.set(e.message ?? 'Yeniden gönderim başarısız.');
            }
        });
    }

    private reloadCurrent(): void {
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
        this.tenantInvites
            .getInvitesList({
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
