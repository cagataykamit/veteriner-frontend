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
            <a actions routerLink="/panel/species/new" pButton type="button" label="Yeni Tür" icon="pi pi-plus" class="p-button-primary"></a>
        </app-page-header>

        @if (loading()) {
            <app-loading-state message="Tür listesi yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else {
            <div class="card">
                <h5 class="mb-4">{{ copy.recordsHeading }}</h5>
                @if (items().length === 0) {
                    <app-empty-state [message]="copy.listEmptyMessage" [hint]="copy.listEmptyHint" />
                } @else {
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
                                    <a [routerLink]="['/panel/species', row.id, 'edit']" class="text-primary font-medium no-underline">Düzenle</a>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                }
            </div>
        }
    `
})
export class SpeciesListPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    private readonly speciesService = inject(SpeciesService);

    readonly loading = signal(false);
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
