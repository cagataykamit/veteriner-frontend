import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { TableModule } from 'primeng/table';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { appointmentStatusLabel } from '@/app/shared/utils/labels.utils';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import type { DashboardSummaryDto } from '@/app/features/dashboard/models/dashboard-summary.model';
import { DashboardService } from '@/app/features/dashboard/services/dashboard.service';
import { getAppointmentTagSeverity } from '@/app/features/dashboard/utils/dashboard-status.helpers';

@Component({
    selector: 'app-dashboard-page',
    standalone: true,
    imports: [
        CommonModule,
        TableModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    template: `
        <app-page-header
            title="Dashboard"
            subtitle="Operasyon"
            description="Özet verileri backend GET /api/v1/dashboard/summary yanıtına göre gösterilir."
        />

        @if (loading()) {
            <app-loading-state message="Özet yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (summary()) {
            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 md:col-span-6 xl:col-span-3">
                    <div class="card mb-0">
                        <span class="block text-muted-color font-medium mb-4">Bugünkü randevular</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ summary()!.todayAppointmentsCount }}</div>
                    </div>
                </div>
                <div class="col-span-12 md:col-span-6 xl:col-span-3">
                    <div class="card mb-0">
                        <span class="block text-muted-color font-medium mb-4">Yaklaşan randevular</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ summary()!.upcomingAppointmentsCount }}</div>
                    </div>
                </div>
                <div class="col-span-12 md:col-span-6 xl:col-span-3">
                    <div class="card mb-0">
                        <span class="block text-muted-color font-medium mb-4">Bugün tamamlanan</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ summary()!.completedTodayCount }}</div>
                    </div>
                </div>
                <div class="col-span-12 md:col-span-6 xl:col-span-3">
                    <div class="card mb-0">
                        <span class="block text-muted-color font-medium mb-4">Bugün iptal</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ summary()!.cancelledTodayCount }}</div>
                    </div>
                </div>

                <div class="col-span-12 xl:col-span-6">
                    <div class="card">
                        <h5 class="mb-4">Randevu listesi (özet)</h5>
                        @if (summary()!.upcomingAppointments.length === 0) {
                            <app-empty-state message="Listelenecek randevu yok." hint="API upcomingAppointments boş döndü." />
                        } @else {
                            <p-table [value]="summary()!.upcomingAppointments" [tableStyle]="{ 'min-width': '100%' }" [paginator]="false">
                                <ng-template #header>
                                    <tr>
                                        <th>Zaman (UTC)</th>
                                        <th>Pet</th>
                                        <th>Durum</th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-row>
                                    <tr>
                                        <td>{{ formatDateTimeDisplay(row.scheduledAtUtc) }}</td>
                                        <td class="text-sm">{{ shortId(row.petId) }}</td>
                                        <td>
                                            <app-status-tag [label]="appointmentStatusLabel(row.status)" [severity]="appointmentSeverity(row.status)" />
                                        </td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        }
                    </div>
                </div>

                <div class="col-span-12 xl:col-span-6">
                    <div class="card">
                        <h5 class="mb-4">Yaklaşan aşılar</h5>
                        <app-empty-state
                            message="Özet uç noktasında aşı alanı yok."
                            hint="Swagger’daki DashboardSummaryDto bu bilgiyi içermiyor; aşılar için /api/v1/... vaccinations ekranı kullanılacak."
                        />
                    </div>
                </div>

                <div class="col-span-12 xl:col-span-8">
                    <div class="card">
                        <h5 class="mb-4">Son client / pet</h5>
                        <div class="grid grid-cols-12 gap-6">
                            <div class="col-span-12 lg:col-span-6">
                                <h6 class="mt-0 mb-3 text-muted-color font-medium">Son client’lar</h6>
                                @if (summary()!.recentClients.length === 0) {
                                    <app-empty-state message="Kayıt yok." />
                                } @else {
                                    <p-table [value]="summary()!.recentClients" [tableStyle]="{ 'min-width': '100%' }" [paginator]="false">
                                        <ng-template #header>
                                            <tr>
                                                <th>Ad</th>
                                                <th>Telefon</th>
                                            </tr>
                                        </ng-template>
                                        <ng-template #body let-row>
                                            <tr>
                                                <td class="font-medium">{{ row.fullName ?? '—' }}</td>
                                                <td>{{ row.phone ?? '—' }}</td>
                                            </tr>
                                        </ng-template>
                                    </p-table>
                                }
                            </div>
                            <div class="col-span-12 lg:col-span-6">
                                <h6 class="mt-0 mb-3 text-muted-color font-medium">Son pet’ler</h6>
                                @if (summary()!.recentPets.length === 0) {
                                    <app-empty-state message="Kayıt yok." />
                                } @else {
                                    <p-table [value]="summary()!.recentPets" [tableStyle]="{ 'min-width': '100%' }" [paginator]="false">
                                        <ng-template #header>
                                            <tr>
                                                <th>Ad</th>
                                                <th>Tür</th>
                                            </tr>
                                        </ng-template>
                                        <ng-template #body let-row>
                                            <tr>
                                                <td class="font-medium">{{ row.name ?? '—' }}</td>
                                                <td>{{ row.species ?? '—' }}</td>
                                            </tr>
                                        </ng-template>
                                    </p-table>
                                }
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-span-12 xl:col-span-4">
                    <div class="card">
                        <h5 class="mb-4">Ödeme özeti</h5>
                        <app-empty-state message="Özet uç noktasında ödeme alanı yok." hint="Swagger DashboardSummaryDto — payments için ayrı API kullanılacak." />
                    </div>
                </div>

                <div class="col-span-12">
                    <div class="card">
                        <h5 class="mb-4">Muayene / işlem özeti</h5>
                        <p class="text-muted-color mt-0 mb-4">
                            Dashboard özetinde ayrı muayene sayacı yok; tamamlanan / iptal randevu sayıları operasyonel referans olarak gösterilir.
                        </p>
                        <div class="grid grid-cols-12 gap-4">
                            <div class="col-span-12 md:col-span-4">
                                <span class="block text-muted-color font-medium mb-2">Toplam client</span>
                                <span class="text-surface-900 dark:text-surface-0 text-xl font-medium">{{ summary()!.totalClientsCount }}</span>
                            </div>
                            <div class="col-span-12 md:col-span-4">
                                <span class="block text-muted-color font-medium mb-2">Toplam pet</span>
                                <span class="text-surface-900 dark:text-surface-0 text-xl font-medium">{{ summary()!.totalPetsCount }}</span>
                            </div>
                            <div class="col-span-12 md:col-span-4">
                                <span class="block text-muted-color font-medium mb-2">Bugün tamamlanan randevu</span>
                                <span class="text-surface-900 dark:text-surface-0 text-xl font-medium">{{ summary()!.completedTodayCount }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        }
    `
})
export class DashboardPageComponent implements OnInit {
    private readonly dashboardService = inject(DashboardService);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly summary = signal<(DashboardSummaryDto & NormalizedLists) | null>(null);

    readonly formatDateTimeDisplay = formatDateTimeDisplay;
    readonly appointmentStatusLabel = appointmentStatusLabel;
    readonly appointmentSeverity = getAppointmentTagSeverity;

    ngOnInit(): void {
        this.reload();
    }

    reload(): void {
        this.loading.set(true);
        this.error.set(null);
        this.dashboardService.getSummary().subscribe({
            next: (data) => {
                this.summary.set(this.normalizeSummary(data));
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message ?? 'Özet yüklenemedi.');
                this.loading.set(false);
            }
        });
    }

    shortId(uuid: string | null | undefined): string {
        if (!uuid) {
            return '—';
        }
        return uuid.length > 12 ? `${uuid.slice(0, 8)}…` : uuid;
    }

    private normalizeSummary(raw: DashboardSummaryDto): DashboardSummaryDto & NormalizedLists {
        return {
            ...raw,
            upcomingAppointments: raw.upcomingAppointments ?? [],
            recentClients: raw.recentClients ?? [],
            recentPets: raw.recentPets ?? []
        };
    }
}

type NormalizedLists = {
    upcomingAppointments: NonNullable<DashboardSummaryDto['upcomingAppointments']>;
    recentClients: NonNullable<DashboardSummaryDto['recentClients']>;
    recentPets: NonNullable<DashboardSummaryDto['recentPets']>;
};
