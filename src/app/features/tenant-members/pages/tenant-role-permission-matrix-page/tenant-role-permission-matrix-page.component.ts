import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { TenantRolePermissionMatrixRowVm } from '@/app/features/tenant-members/models/tenant-members-vm.model';
import { TenantMembersService } from '@/app/features/tenant-members/services/tenant-members.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

@Component({
    selector: 'app-tenant-role-permission-matrix-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        ButtonModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
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
            } @else if (rows().length === 0) {
                <app-empty-state [message]="copy.tenantRoleMatrixEmptyMessage" [hint]="copy.tenantRoleMatrixEmptyHint" />
            } @else {
                <p class="text-sm text-muted-color m-0 mb-4">Salt okunur; sunucudaki atanabilir rol ve permission tanımlarına göredir.</p>
                <div class="space-y-4">
                    @for (row of rows(); track row.roleId) {
                        <div class="rounded-border border border-surface-200 dark:border-surface-700 p-4 bg-surface-0 dark:bg-surface-900">
                            <h5 class="mt-0 mb-3 text-base">{{ row.roleName }}</h5>
                            @if (row.permissions.length === 0) {
                                <p class="text-sm text-muted-color m-0">{{ copy.tenantRoleMatrixEmptyMessage }}</p>
                            } @else {
                                <ul class="list-none p-0 m-0 flex flex-wrap gap-2">
                                    @for (p of row.permissions; track p.id + p.name) {
                                        <li
                                            class="text-xs sm:text-sm px-2 py-1 rounded-md bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-600"
                                        >
                                            {{ p.name }}
                                        </li>
                                    }
                                </ul>
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
    private readonly tenantMembers = inject(TenantMembersService);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly rows = signal<TenantRolePermissionMatrixRowVm[]>([]);

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
