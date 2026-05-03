import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import type { ClinicListItemVm } from '@/app/features/clinics/models/clinic-vm.model';
import { ClinicsService } from '@/app/features/clinics/services/clinics.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';

@Component({
    selector: 'app-clinics-list-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        TableModule,
        ButtonModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent
    ],
    template: `
        <app-page-header
            title="Klinikler"
            subtitle="Hesap"
            description="Kurumunuza kayıtlı kliniklerin listesi ve ayarları."
        >
            @if (canCreateClinic()) {
                <a
                    actions
                    routerLink="/panel/settings/clinics/new"
                    pButton
                    type="button"
                    label="Yeni Klinik"
                    icon="pi pi-plus"
                    class="p-button-primary"
                ></a>
            }
        </app-page-header>

        <div class="card">
            @if (loading()) {
                <app-loading-state message="Klinik listesi yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else if (rows().length === 0) {
                <app-empty-state [message]="copy.clinicsListEmptyMessage" [hint]="copy.clinicsListEmptyHint" />
            } @else {
                <div class="hidden lg:block overflow-x-auto">
                    <p-table [value]="rows()" [tableStyle]="{ 'min-width': '42rem' }">
                        <ng-template #header>
                            <tr>
                                <th>Ad</th>
                                <th>Şehir</th>
                                <th>Durum</th>
                                <th style="width: 10rem">İşlemler</th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr>
                                <td class="font-medium break-words">{{ row.name }}</td>
                                <td>{{ row.city || '—' }}</td>
                                <td>
                                    @if (row.isActive === true) {
                                        <span class="text-green-700 dark:text-green-400 text-sm">Aktif</span>
                                    } @else if (row.isActive === false) {
                                        <span class="text-muted-color text-sm">Pasif</span>
                                    } @else {
                                        <span class="text-muted-color text-sm">—</span>
                                    }
                                </td>
                                <td>
                                    <a
                                        [routerLink]="['/panel/settings/clinics', row.id]"
                                        pButton
                                        type="button"
                                        class="p-button-text p-button-sm"
                                        label="Detay / Düzenle"
                                        icon="pi pi-pencil"
                                    ></a>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>

                <div class="lg:hidden space-y-3">
                    @for (row of rows(); track row.id) {
                        <div
                            class="rounded-border border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4 shadow-sm"
                        >
                            <div class="text-sm font-medium text-surface-900 dark:text-surface-0 break-words mb-2">{{ row.name }}</div>
                            <div class="text-sm text-muted-color mb-1">Şehir: {{ row.city || '—' }}</div>
                            <div class="text-sm mb-3">
                                @if (row.isActive === true) {
                                    <span class="text-green-700 dark:text-green-400">Aktif</span>
                                } @else if (row.isActive === false) {
                                    <span class="text-muted-color">Pasif</span>
                                } @else {
                                    <span class="text-muted-color">—</span>
                                }
                            </div>
                            <a
                                [routerLink]="['/panel/settings/clinics', row.id]"
                                pButton
                                type="button"
                                class="p-button-text p-button-sm"
                                label="Detay / Düzenle"
                                icon="pi pi-pencil"
                            ></a>
                        </div>
                    }
                </div>
            }
        </div>
    `
})
export class ClinicsListPageComponent implements OnInit {
    private readonly clinics = inject(ClinicsService);
    private readonly auth = inject(AuthService);

    readonly copy = PANEL_COPY;
    readonly canCreateClinic = computed(() => this.auth.hasOperationClaim(CLINICS_CREATE_CLAIM));
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly rows = signal<ClinicListItemVm[]>([]);

    ngOnInit(): void {
        this.reload();
    }

    reload(): void {
        this.loading.set(true);
        this.error.set(null);
        this.clinics.listClinics().subscribe({
            next: (list) => {
                this.rows.set(list);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message ?? 'Yükleme hatası');
                this.loading.set(false);
            }
        });
    }
}
