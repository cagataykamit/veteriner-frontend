import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { BreedsService } from '@/app/features/breeds/services/breeds.service';
import type { BreedListItemVm } from '@/app/features/breeds/models/breed-vm.model';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';

@Component({
    selector: 'app-breeds-list-page',
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
        <app-page-header title="Irklar" subtitle="Referans yönetimi" description="Irk kayıtlarını yönetin.">
            <a actions routerLink="/panel/breeds/new" pButton type="button" label="Yeni Irk" icon="pi pi-plus" class="p-button-primary"></a>
        </app-page-header>

        @if (loading()) {
            <app-loading-state message="Irk listesi yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else {
            <div class="card">
                <div class="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h5 class="m-0">Irklar</h5>
                    @if (items().length > 0) {
                        <span class="text-sm text-muted-color whitespace-nowrap">{{ items().length }} kayıt</span>
                    }
                </div>
                @if (items().length === 0) {
                    <app-empty-state [message]="copy.listEmptyMessage" [hint]="copy.listEmptyHint" />
                } @else {
                    <div class="hidden lg:block overflow-x-auto">
                        <p-table [value]="items()" [tableStyle]="{ 'min-width': '56rem' }">
                            <ng-template #header>
                                <tr>
                                    <th>Ad</th>
                                    <th>Tür</th>
                                    <th>Durum</th>
                                    <th style="width: 8rem">İşlemler</th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-row>
                                <tr>
                                    <td class="font-medium">{{ row.name }}</td>
                                    <td>{{ row.speciesName }}</td>
                                    <td>
                                        <app-status-tag [label]="activeLabel(row.isActive)" [severity]="activeSeverity(row.isActive)" />
                                    </td>
                                    <td>
                                        <a [routerLink]="['/panel/breeds', row.id, 'edit']" class="text-primary font-medium no-underline">Düzenle</a>
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
                                <div class="text-sm text-muted-color mb-3 min-w-0 break-words">
                                    <span class="font-medium">Tür: </span>{{ row.speciesName }}
                                </div>
                                <div class="flex justify-end pt-1 border-t border-surface-200 dark:border-surface-700">
                                    <a [routerLink]="['/panel/breeds', row.id, 'edit']" class="text-primary font-medium no-underline">Düzenle →</a>
                                </div>
                            </div>
                        }
                    </div>
                }
            </div>
        }
    `
})
export class BreedsListPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    private readonly breedsService = inject(BreedsService);

    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly items = signal<BreedListItemVm[]>([]);

    readonly activeLabel = (isActive: boolean) => (isActive ? 'Aktif' : 'Pasif');
    readonly activeSeverity = (isActive: boolean) => (isActive ? 'success' : 'secondary');

    ngOnInit(): void {
        this.reload();
    }

    reload(): void {
        this.loading.set(true);
        this.error.set(null);
        this.breedsService.getBreedList().subscribe({
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
