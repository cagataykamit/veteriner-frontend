import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { SpeciesService } from '@/app/features/species/services/species.service';
import type { SpeciesListItemVm } from '@/app/features/species/models/species-vm.model';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';

@Component({
    selector: 'app-species-list-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        TableModule,
        ButtonModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    template: `
        <app-page-header title="Türler" subtitle="Referans yönetimi" description="Tür kayıtlarını yönetin.">
            @if (!ro.mutationBlocked()) {
                <a actions routerLink="/panel/species/new" pButton type="button" label="Yeni Tür" icon="pi pi-plus" class="p-button-primary"></a>
            } @else {
                <button
                    actions
                    pButton
                    type="button"
                    label="Yeni Tür (salt okunur)"
                    icon="pi pi-lock"
                    [disabled]="true"
                    class="p-button-secondary"
                ></button>
            }
        </app-page-header>

        <div class="card">
            @if (loading()) {
                <app-loading-state message="Tür listesi yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else {
                <div class="flex flex-col gap-4">
                    <div class="pb-3 border-b border-surface-200 dark:border-surface-700">
                        <div class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3">
                            <div class="min-w-0">
                                <h5 class="m-0">Türler</h5>
                                @if (items().length > 0) {
                                    <span class="text-sm text-muted-color whitespace-nowrap">{{ items().length }} kayıt</span>
                                }
                            </div>
                        </div>
                    </div>
                    @if (items().length === 0) {
                        <app-empty-state [message]="copy.listEmptyMessage" [hint]="copy.listEmptyHint" />
                    } @else {
                        <div class="hidden lg:block overflow-x-auto">
                            <p-table [value]="items()" [tableStyle]="{ 'min-width': '60rem' }">
                                <ng-template #header>
                                    <tr>
                                        <th>Ad</th>
                                        <th>Kod</th>
                                        <th>Durum</th>
                                        <th>Sıra</th>
                                        <th style="width: 8rem">İşlemler</th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-row>
                                    <tr>
                                        <td class="font-medium">{{ row.name }}</td>
                                        <td>{{ row.code }}</td>
                                        <td>
                                            <app-status-tag [label]="activeLabel(row.isActive)" [severity]="activeSeverity(row.isActive)" />
                                        </td>
                                        <td>{{ row.displayOrder }}</td>
                                        <td>
                                            @if (!ro.mutationBlocked()) {
                                                <a [routerLink]="['/panel/species', row.id, 'edit']" class="text-primary font-medium no-underline">Düzenle</a>
                                            } @else {
                                                <span class="text-muted-color">Düzenle (salt okunur)</span>
                                            }
                                        </td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>

                        <div class="lg:hidden space-y-3">
                            @for (row of items(); track row.id) {
                                <div
                                    class="rounded-border border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4 shadow-sm"
                                >
                                    <div class="flex flex-wrap items-start justify-between gap-2 gap-y-1 mb-2 min-w-0">
                                        <div class="text-sm font-medium text-surface-900 dark:text-surface-0 break-words">{{ row.name }}</div>
                                        <app-status-tag [label]="activeLabel(row.isActive)" [severity]="activeSeverity(row.isActive)" />
                                    </div>
                                    <div class="text-xs text-muted-color mb-3 min-w-0 space-y-0.5">
                                        <div>Kod: {{ row.code }}</div>
                                        <div>Sıra: {{ row.displayOrder }}</div>
                                    </div>
                                    <div class="flex justify-end pt-1 border-t border-surface-200 dark:border-surface-700">
                                        @if (!ro.mutationBlocked()) {
                                            <a [routerLink]="['/panel/species', row.id, 'edit']" class="text-primary font-medium no-underline">Düzenle →</a>
                                        } @else {
                                            <span class="text-muted-color">Düzenle (salt okunur)</span>
                                        }
                                    </div>
                                </div>
                            }
                        </div>
                    }
                </div>
            }
        </div>
    `
})
export class SpeciesListPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    private readonly speciesService = inject(SpeciesService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly items = signal<SpeciesListItemVm[]>([]);

    readonly activeLabel = (isActive: boolean) => (isActive ? 'Aktif' : 'Pasif');
    readonly activeSeverity = (isActive: boolean) => (isActive ? 'success' : 'secondary');

    ngOnInit(): void {
        this.reload();
    }

    reload(): void {
        this.loading.set(true);
        this.error.set(null);
        this.speciesService.getSpeciesList().subscribe({
            next: (items) => {
                this.items.set(items);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message ?? 'Yükleme hatası');
                this.loading.set(false);
            }
        });
    }
}
