import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import type { DashboardOperationalVm } from '@/app/features/dashboard/models/dashboard-operational.model';
import { DashboardService } from '@/app/features/dashboard/services/dashboard.service';
import { appointmentStatusLabel, appointmentStatusSeverity } from '@/app/features/appointments/utils/appointment-status.utils';
import { paymentMethodLabel } from '@/app/features/payments/utils/payment-method.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatDateDisplay, formatDateTimeDisplay, formatTimeDisplay } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import type { DashboardRecentPetDto } from '@/app/features/dashboard/models/dashboard-summary.model';

@Component({
    selector: 'app-dashboard-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        TableModule,
        ButtonModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppStatusTagComponent
    ],
    template: `
        <app-page-header
            title="Özet"
            subtitle="Operasyon"
            description="Günlük randevular, aşılar, muayeneler ve ödemeler — özet ve listeler paralel yüklenir."
        />

        @if (loading()) {
            <app-loading-state message="Operasyon verileri yükleniyor…" />
        } @else if (dash(); as d) {
            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 md:col-span-6 xl:col-span-3">
                    <div class="card mb-0">
                        <span class="block text-muted-color font-medium mb-4">Bugünkü randevular</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                            {{ metricCount(todayAppointmentsMetric(d)) }}
                        </div>
                    </div>
                </div>
                <div class="col-span-12 md:col-span-6 xl:col-span-3">
                    <div class="card mb-0">
                        <span class="block text-muted-color font-medium mb-4">Yaklaşan randevular</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                            {{ metricCount(d.summary.data?.upcomingAppointmentsCount) }}
                        </div>
                    </div>
                </div>
                <div class="col-span-12 md:col-span-6 xl:col-span-3">
                    <div class="card mb-0">
                        <span class="block text-muted-color font-medium mb-4">Bugün tamamlanan</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                            {{ metricCount(d.summary.data?.completedTodayCount) }}
                        </div>
                    </div>
                </div>
                <div class="col-span-12 md:col-span-6 xl:col-span-3">
                    <div class="card mb-0">
                        <span class="block text-muted-color font-medium mb-4">Bugün iptal</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">
                            {{ metricCount(d.summary.data?.cancelledTodayCount) }}
                        </div>
                    </div>
                </div>

                @if (d.summary.error) {
                    <div class="col-span-12">
                        <div class="card mb-0">
                            <p class="text-red-500 m-0" role="alert">{{ d.summary.error }}</p>
                            <p class="text-muted-color text-sm mt-2 mb-0">Üst sayaçlar bu yüzden eksik olabilir.</p>
                        </div>
                    </div>
                } @else if (d.summary.data) {
                    <div class="col-span-12">
                        <p class="text-muted-color text-sm m-0">
                            Toplam <span class="font-medium">{{ d.summary.data.totalClientsCount }}</span> müşteri ·
                            <span class="font-medium">{{ d.summary.data.totalPetsCount }}</span> hayvan kaydı.
                        </p>
                    </div>
                }

                <div class="col-span-12">
                    <div class="card">
                        <div class="flex flex-wrap justify-between items-center gap-2 mb-4">
                            <h5 class="mt-0 mb-0">Bugünkü randevular</h5>
                            <a routerLink="/panel/appointments" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (d.todayAppointments.error) {
                            <p class="text-red-500 m-0" role="alert">{{ d.todayAppointments.error }}</p>
                        } @else if (d.todayAppointments.data.length === 0) {
                            <app-empty-state message="Bugün için randevu yok." hint="Tarih filtresi yerel güne göredir." />
                        } @else {
                            <p-table [value]="d.todayAppointments.data" [tableStyle]="{ 'min-width': '100%' }" [paginator]="false">
                                <ng-template #header>
                                    <tr>
                                        <th>Saat</th>
                                        <th>Müşteri</th>
                                        <th>Hayvan</th>
                                        <th>Durum</th>
                                        <th></th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-row>
                                    <tr>
                                        <td>{{ formatTime(row.scheduledAtUtc) }}</td>
                                        <td>
                                            @if (row.clientId) {
                                                <a [routerLink]="['/panel/clients', row.clientId]" class="text-primary font-medium no-underline">{{
                                                    row.clientName
                                                }}</a>
                                            } @else {
                                                {{ row.clientName }}
                                            }
                                        </td>
                                        <td>
                                            @if (row.petId) {
                                                <a [routerLink]="['/panel/pets', row.petId]" class="text-primary font-medium no-underline">{{ row.petName }}</a>
                                            } @else {
                                                {{ row.petName }}
                                            }
                                        </td>
                                        <td>
                                            <app-status-tag [label]="apptStatusLabel(row.status)" [severity]="apptStatusSeverity(row.status)" />
                                        </td>
                                        <td>
                                            <a [routerLink]="['/panel/appointments', row.id]" class="text-primary font-medium no-underline text-sm">Detay</a>
                                        </td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        }
                    </div>
                </div>

                <div class="col-span-12 xl:col-span-6">
                    <div class="card h-full">
                        <div class="flex flex-wrap justify-between items-center gap-2 mb-4">
                            <h5 class="mt-0 mb-0">Yaklaşan aşılar</h5>
                            <a routerLink="/panel/vaccinations" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (d.upcomingVaccinations.error) {
                            <p class="text-red-500 m-0" role="alert">{{ d.upcomingVaccinations.error }}</p>
                        } @else if (d.upcomingVaccinations.data.length === 0) {
                            <app-empty-state message="Önümüzdeki dönem için uygun aşı kaydı yok." />
                        } @else {
                            <p-table [value]="d.upcomingVaccinations.data" [tableStyle]="{ 'min-width': '100%' }" [paginator]="false">
                                <ng-template #header>
                                    <tr>
                                        <th>Sonraki tarih</th>
                                        <th>Aşı</th>
                                        <th>Hayvan</th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-row>
                                    <tr>
                                        <td>{{ formatDate(row.dueAtUtc) }}</td>
                                        <td>{{ row.vaccineName }}</td>
                                        <td>
                                            @if (row.petId) {
                                                <a [routerLink]="['/panel/pets', row.petId]" class="text-primary font-medium no-underline">{{ row.petName }}</a>
                                            } @else {
                                                {{ row.petName }}
                                            }
                                        </td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        }
                    </div>
                </div>

                <div class="col-span-12 xl:col-span-6">
                    <div class="card h-full">
                        <div class="flex flex-wrap justify-between items-center gap-2 mb-4">
                            <h5 class="mt-0 mb-0">Son muayeneler</h5>
                            <a routerLink="/panel/examinations" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (d.recentExaminations.error) {
                            <p class="text-red-500 m-0" role="alert">{{ d.recentExaminations.error }}</p>
                        } @else if (d.recentExaminations.data.length === 0) {
                            <app-empty-state message="Muayene kaydı yok." />
                        } @else {
                            <p-table [value]="d.recentExaminations.data" [tableStyle]="{ 'min-width': '100%' }" [paginator]="false">
                                <ng-template #header>
                                    <tr>
                                        <th>Tarih</th>
                                        <th>Hayvan</th>
                                        <th>Müşteri</th>
                                        <th></th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-row>
                                    <tr>
                                        <td>{{ formatDateTime(row.examinedAtUtc) }}</td>
                                        <td>{{ row.petName }}</td>
                                        <td>{{ row.clientName }}</td>
                                        <td>
                                            <a [routerLink]="['/panel/examinations', row.id]" class="text-primary font-medium no-underline text-sm">Detay</a>
                                        </td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        }
                    </div>
                </div>

                <div class="col-span-12">
                    <div class="card">
                        <div class="flex flex-wrap justify-between items-center gap-2 mb-4">
                            <h5 class="mt-0 mb-0">Son ödemeler</h5>
                            <a routerLink="/panel/payments" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (d.attentionPayments.error) {
                            <p class="text-red-500 m-0" role="alert">{{ d.attentionPayments.error }}</p>
                        } @else if (d.attentionPayments.data.length === 0) {
                            <app-empty-state message="Ödeme kaydı yok." />
                        } @else {
                            <p-table [value]="d.attentionPayments.data" [tableStyle]="{ 'min-width': '100%' }" [paginator]="false">
                                <ng-template #header>
                                    <tr>
                                        <th>Tutar</th>
                                        <th>Yöntem</th>
                                        <th>Ödeme tarihi</th>
                                        <th>Hayvan</th>
                                        <th></th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-row>
                                    <tr>
                                        <td>{{ money(row.amount, row.currency) }}</td>
                                        <td>{{ payMethodLabel(row.method) }}</td>
                                        <td>{{ formatDateTime(row.paidAtUtc) }}</td>
                                        <td>{{ row.petName }}</td>
                                        <td>
                                            <a [routerLink]="['/panel/payments', row.id]" class="text-primary font-medium no-underline text-sm">Detay</a>
                                        </td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        }
                    </div>
                </div>

                <div class="col-span-12">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Son müşteri / hayvan</h5>
                        @if (d.summary.error || !d.summary.data) {
                            <app-empty-state message="Özet yüklenemediği için son kayıtlar gösterilemiyor." />
                        } @else {
                            <div class="grid grid-cols-12 gap-6">
                                <div class="col-span-12 lg:col-span-6">
                                    <h6 class="mt-0 mb-3 text-muted-color font-medium">Son müşteriler</h6>
                                    @if (d.summary.data.recentClients.length === 0) {
                                        <app-empty-state message="Kayıt yok." />
                                    } @else {
                                        <p-table [value]="d.summary.data.recentClients" [tableStyle]="{ 'min-width': '100%' }" [paginator]="false">
                                            <ng-template #header>
                                                <tr>
                                                    <th>Ad</th>
                                                    <th>Telefon</th>
                                                    <th></th>
                                                </tr>
                                            </ng-template>
                                            <ng-template #body let-row>
                                                <tr>
                                                    <td class="font-medium">{{ row.fullName ?? '—' }}</td>
                                                    <td>{{ row.phone ?? '—' }}</td>
                                                    <td>
                                                        <a [routerLink]="['/panel/clients', row.id]" class="text-primary font-medium no-underline text-sm">Detay</a>
                                                    </td>
                                                </tr>
                                            </ng-template>
                                        </p-table>
                                    }
                                </div>
                                <div class="col-span-12 lg:col-span-6">
                                    <h6 class="mt-0 mb-3 text-muted-color font-medium">Son hayvanlar</h6>
                                    @if (d.summary.data.recentPets.length === 0) {
                                        <app-empty-state message="Kayıt yok." />
                                    } @else {
                                        <p-table [value]="d.summary.data.recentPets" [tableStyle]="{ 'min-width': '100%' }" [paginator]="false">
                                            <ng-template #header>
                                                <tr>
                                                    <th>Ad</th>
                                                    <th>Tür</th>
                                                    <th></th>
                                                </tr>
                                            </ng-template>
                                            <ng-template #body let-row>
                                                <tr>
                                                    <td class="font-medium">{{ row.name ?? '—' }}</td>
                                                    <td>{{ petSpeciesText(row) }}</td>
                                                    <td>
                                                        <a [routerLink]="['/panel/pets', row.id]" class="text-primary font-medium no-underline text-sm">Detay</a>
                                                    </td>
                                                </tr>
                                            </ng-template>
                                        </p-table>
                                    }
                                </div>
                            </div>
                        }
                    </div>
                </div>

                <div class="col-span-12">
                    <p-button [label]="copy.buttonRefresh" icon="pi pi-refresh" severity="secondary" (onClick)="reload()" [disabled]="loading()" />
                </div>
            </div>
        } @else {
            <div class="card">
                <p class="m-0 mb-4 text-muted-color">Özet verisi alınamadı.</p>
                <p-button [label]="copy.buttonRefresh" icon="pi pi-refresh" (onClick)="reload()" />
            </div>
        }
    `
})
export class DashboardPageComponent implements OnInit {
    private readonly dashboardService = inject(DashboardService);

    readonly copy = PANEL_COPY;

    readonly loading = signal(true);
    readonly dash = signal<DashboardOperationalVm | null>(null);

    readonly formatDate = (v: string | null) => formatDateDisplay(v);
    readonly formatDateTime = (v: string | null) => formatDateTimeDisplay(v);
    readonly formatTime = (v: string | null) => formatTimeDisplay(v);
    readonly apptStatusLabel = appointmentStatusLabel;
    readonly apptStatusSeverity = appointmentStatusSeverity;
    readonly payMethodLabel = paymentMethodLabel;

    ngOnInit(): void {
        this.reload();
    }

    reload(): void {
        this.loading.set(true);
        this.dashboardService.loadOperationalDashboard().subscribe({
            next: (data) => {
                this.dash.set(data);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.dash.set(null);
            }
        });
    }

    metricCount(n: number | null | undefined): string | number {
        if (n === undefined || n === null) {
            return '—';
        }
        return n;
    }

    todayAppointmentsMetric(d: DashboardOperationalVm): number | null {
        // "Bugünkü randevular" kartı ve tablosu aynı kavramı göstersin:
        // öncelik tablo verisi (aynı source/filter), fallback summary sayacı.
        if (!d.todayAppointments.error) {
            return d.todayAppointments.data.length;
        }
        return d.summary.data?.todayAppointmentsCount ?? null;
    }

    money(amount: number | null, currency: string): string {
        return formatMoney(amount, currency);
    }

    petSpeciesText(row: DashboardRecentPetDto): string {
        const species = row.speciesName?.trim() || row.species?.trim() || '-';
        const breed = row.breedName?.trim() || row.breed?.trim() || '';
        return breed ? `${species} · ${breed}` : species;
    }
}
