import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { TenantRolePermissionMatrixRowVm } from '@/app/features/tenant-members/models/tenant-members-vm.model';
import { TenantMembersService } from '@/app/features/tenant-members/services/tenant-members.service';
import {
    buildPermissionGroupPanels,
    permissionDisplayLabel,
    permissionTooltipText,
    type PermissionGroupPanelVm
} from '@/app/features/tenant-members/utils/tenant-role-permission-display.utils';
import { buildFixedRoleMatrixRows } from '@/app/features/tenant-members/utils/tenant-role-fixed-role.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

type MatrixRowView = TenantRolePermissionMatrixRowVm & { groups: PermissionGroupPanelVm[] };

@Component({
    selector: 'app-tenant-role-permission-matrix-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        ButtonModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent
    ],
    template: `
        <app-page-header
            [title]="copy.tenantRoleMatrixTitle"
            [subtitle]="copy.tenantRoleMatrixNavTitle"
            [description]="copy.tenantRoleMatrixDescription"
        >
            <a actions routerLink="/panel/settings/members" pButton type="button" [label]="copy.tenantRoleMatrixBackMembers" icon="pi pi-arrow-left" class="p-button-secondary"></a>
        </app-page-header>

        <div class="card">
            @if (loading()) {
                <app-loading-state [message]="copy.tenantRoleMatrixLoading" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else {
                <p class="text-sm text-muted-color m-0 mb-3">{{ copy.tenantRoleMatrixGlobalInfo }}</p>
                @if (allRolesEmpty()) {
                    <div class="mb-4 p-3 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                        <p class="m-0 text-sm text-muted-color">{{ copy.tenantRoleMatrixEmptyHint }}</p>
                    </div>
                }
                <div class="space-y-4">
                    @for (row of displayRowsWithGroups(); track row.roleId) {
                        <div class="rounded-border border border-surface-200 dark:border-surface-700 p-4 bg-surface-0 dark:bg-surface-900">
                            <div class="flex flex-wrap items-start justify-between gap-2 mb-3">
                                <h5 class="mt-0 mb-0 text-base font-semibold text-surface-900 dark:text-surface-0">{{ row.roleName }}</h5>
                                @if (row.permissions.length > 0) {
                                    <span class="text-xs text-muted-color whitespace-nowrap shrink-0">
                                        {{ copy.tenantRoleMatrixTotalPrefix }} {{ row.permissions.length }} {{ copy.tenantRoleMatrixTotalSuffix }}
                                    </span>
                                }
                            </div>
                            @if (row.permissions.length === 0) {
                                <p class="text-sm text-muted-color m-0">{{ copy.tenantRoleMatrixEmptyMessage }}</p>
                            } @else {
                                @for (g of row.groups; track g.rawKey) {
                                    <div class="mb-4 last:mb-0">
                                        <p class="text-xs font-semibold text-muted-color m-0 mb-2">{{ g.title }}</p>
                                        <ul class="list-none p-0 m-0 flex flex-wrap gap-2">
                                            @for (p of g.items; track p.id + permissionDisplayLabel(p)) {
                                                <li
                                                    class="text-xs sm:text-sm max-w-[18rem] truncate px-2 py-1 rounded-md bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-600"
                                                    [attr.title]="permissionTooltipText(p)"
                                                >
                                                    {{ permissionDisplayLabel(p) }}
                                                </li>
                                            }
                                        </ul>
                                    </div>
                                }
                            }
                        </div>
                    }
                </div>
            }
        </div>
    `
})
export class TenantRolePermissionMatrixPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    /** Şablonda pipe olmadan kullanım için şablona açık referanslar. */
    readonly permissionDisplayLabel = permissionDisplayLabel;
    readonly permissionTooltipText = permissionTooltipText;
    private readonly tenantMembers = inject(TenantMembersService);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly rows = signal<TenantRolePermissionMatrixRowVm[]>([]);
    readonly displayRows = computed(() => buildFixedRoleMatrixRows(this.rows()));
    readonly displayRowsWithGroups = computed((): MatrixRowView[] => {
        const other = this.copy.tenantRoleMatrixGroupOther;
        return this.displayRows().map((row) => ({
            ...row,
            groups: row.permissions.length ? buildPermissionGroupPanels(row.permissions, other) : []
        }));
    });
    readonly allRolesEmpty = computed(() => this.displayRows().every((row) => row.permissions.length === 0));

    ngOnInit(): void {
        this.load();
    }

    reload(): void {
        this.load();
    }

    private load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.tenantMembers.getAssignableRolePermissionMatrix().subscribe({
            next: (r) => {
                this.rows.set(r);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message ?? this.copy.tenantRoleMatrixLoadError);
                this.loading.set(false);
            }
        });
    }
}
