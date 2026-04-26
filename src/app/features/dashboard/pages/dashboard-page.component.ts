import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { map, switchMap, tap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DashboardMiniTrendChartComponent } from '@/app/features/dashboard/components/dashboard-mini-trend-chart.component';
import type { DashboardOperationalVm } from '@/app/features/dashboard/models/dashboard-operational.model';
import type { DashboardTrendDayVm } from '@/app/features/dashboard/models/dashboard-trend.model';
import { buildSevenDayTrendPoints } from '@/app/features/dashboard/utils/dashboard-trend.utils';
import {
    DashboardService,
    dashboardVmWithPendingLists,
    mergeDashboardListPhaseIntoVm
} from '@/app/features/dashboard/services/dashboard.service';
import { appointmentStatusLabel, appointmentStatusSeverity } from '@/app/features/appointments/utils/appointment-status.utils';
import { paymentMethodLabel } from '@/app/features/payments/utils/payment-method.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent, type StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import {
    formatDateDisplay,
    formatDateTimeDisplay,
    formatTimeDisplay,
    formatUtcIsoAsLocalDateTimeDisplay
} from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import type { DashboardRecentPetDto } from '@/app/features/dashboard/models/dashboard-summary.model';
import type { DashboardActionSeverity } from '@/app/features/dashboard/models/dashboard-operational-alerts.model';
import { AuthService } from '@/app/core/auth/auth.service';
import { panelReturnUrlOrDefault } from '@/app/core/auth/auth-return-url.utils';

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
        AppStatusTagComponent,
        DashboardMiniTrendChartComponent
    ],
    template: `
        <app-page-header title="Özet" subtitle="Operasyon" [description]="pageDescription()" />

        @if (!clinicContextOk()) {
            <div class="card">
                <app-empty-state
                    [message]="copy.dashboardNeedClinicMessage"
                    [hint]="copy.dashboardNeedClinicHint"
                    iconClass="pi pi-building"
                >
                    <a
                        routerLink="/auth/select-clinic"
                        [queryParams]="selectClinicQueryParams"
                        pButton
                        type="button"
                        label="Klinik seç"
                        icon="pi pi-check"
                        class="p-button-primary"
                    ></a>
                </app-empty-state>
            </div>
        } @else {
            <div
                class="grid grid-cols-1 gap-6 mb-6"
                [ngClass]="{
                    'lg:grid-cols-2': !loading() && !!dash() && hasTopRightOperationalPanel(dash()!)
                }"
            >
                <div>
                    <div class="card mb-0 h-full">
                        <h5 class="mt-0 mb-3 text-base font-medium text-surface-900 dark:text-surface-0">{{ copy.dashboardQuickActionsTitle }}</h5>
                        <div class="flex flex-wrap gap-2">
                            @if (canOpenAppointments()) {
                                <a routerLink="/panel/appointments/new" pButton type="button" label="Yeni Randevu" icon="pi pi-plus" class="p-button-sm"></a>
                            }
                            @if (canOpenClients()) {
                                <a routerLink="/panel/clients" pButton type="button" label="Müşteriler" icon="pi pi-users" severity="secondary" class="p-button-sm"></a>
                            }
                            @if (canOpenPets()) {
                                <a routerLink="/panel/pets" pButton type="button" label="Hayvanlar" icon="pi pi-heart" severity="secondary" class="p-button-sm"></a>
                            }
                            @if (canShowPaymentsQuickAction()) {
                                <a routerLink="/panel/payments" pButton type="button" label="Ödemeler" icon="pi pi-credit-card" severity="secondary" class="p-button-sm"></a>
                            }
                        </div>
                    </div>
                </div>
                @if (!loading() && dash(); as d) {
                    @if (hasTopRightOperationalPanel(d)) {
                        <div class="flex flex-col gap-6">
                            @if (d.alerts.length > 0) {
                                <div class="card mb-0">
                                    <h5 class="mt-0 mb-4">Uyarılar</h5>
                                    <div class="flex flex-col gap-3">
                                        @for (alert of d.alerts; track alert.key) {
                                            <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                                                <div class="flex items-start justify-between gap-3">
                                                    <div class="min-w-0">
                                                        <div class="flex items-center gap-2 mb-1">
                                                            <app-status-tag [label]="severityLabel(alert.severity)" [severity]="statusSeverity(alert.severity)" />
                                                            <span class="font-medium text-surface-900 dark:text-surface-0">{{ alert.title }}</span>
                                                        </div>
                                                        <p class="m-0 text-sm text-muted-color">{{ alert.description }}</p>
                                                    </div>
                                                    @if (alert.route) {
                                                        <a
                                                            [routerLink]="[alert.route]"
                                                            pButton
                                                            type="button"
                                                            label="Git"
                                                            severity="secondary"
                                                            class="p-button-sm whitespace-nowrap"
                                                            [attr.aria-label]="alert.title + ' detayina git'"
                                                        ></a>
                                                    }
                                                </div>
                                            </div>
                                        }
                                    </div>
                                </div>
                            }
                            @if (d.canViewOperationalAlerts && d.actionItems.length > 0) {
                                <div class="card mb-0">
                                    <h5 class="mt-0 mb-4">Öncelikli işler</h5>
                                    <div class="grid grid-cols-1 gap-3">
                                        @for (item of d.actionItems; track item.key) {
                                            <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                                                <div class="flex items-start justify-between gap-3">
                                                    <div class="min-w-0">
                                                        <div class="flex items-center gap-2 mb-1">
                                                            <app-status-tag [label]="severityLabel(item.severity)" [severity]="statusSeverity(item.severity)" />
                                                            <span class="font-medium text-surface-900 dark:text-surface-0">{{ item.title }}</span>
                                                            <span class="text-sm text-muted-color">({{ item.count }})</span>
                                                        </div>
                                                        <p class="m-0 text-sm text-muted-color">{{ item.description }}</p>
                                                    </div>
                                                    @if (item.route) {
                                                        <a
                                                            [routerLink]="[item.route]"
                                                            pButton
                                                            type="button"
                                                            label="İncele"
                                                            class="p-button-sm whitespace-nowrap"
                                                            [attr.aria-label]="item.title + ' listesini ac'"
                                                        ></a>
                                                    }
                                                </div>
                                            </div>
                                        }
                                    </div>
                                </div>
                            }
                            @if (d.capabilities.error || d.operationalAlerts.error) {
                                <div class="card mb-0">
                                    <p class="m-0 text-sm text-muted-color">
                                        @if (d.capabilities.error) {
                                            {{ d.capabilities.error }}
                                        } @else if (d.operationalAlerts.error) {
                                            {{ d.operationalAlerts.error }}
                                        }
                                    </p>
                                </div>
                            }
                        </div>
                    }
                }
            </div>

            @if (loading()) {
                <app-loading-state message="Operasyon verileri yükleniyor…" />
            } @else if (dash(); as d) {
                <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12">
                    <p class="text-muted-color text-sm m-0 mb-0">{{ copy.dashboardContextFootnote }}</p>
                </div>
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

                <div class="col-span-12 lg:col-span-6">
                    <div class="card mb-0 h-full">
                        <app-dashboard-mini-trend-chart
                            title="Son 7 gün — randevu"
                            [points]="appointmentTrendPoints(d)"
                            valueKind="count"
                        />
                    </div>
                </div>
                @if (canViewFinance(d)) {
                    <div class="col-span-12 lg:col-span-6">
                        <div class="card mb-0 h-full">
                            <app-dashboard-mini-trend-chart
                                title="Son 7 gün — tahsilat"
                                [points]="paidTrendPoints(d)"
                                valueKind="money"
                            />
                        </div>
                    </div>
                }

                @if (canViewFinance(d) && d.finance.error) {
                    <div class="col-span-12">
                        <div class="card mb-0">
                            <p class="text-red-500 m-0" role="alert">{{ d.finance.error }}</p>
                            <p class="text-muted-color text-sm mt-2 mb-0">Finans kartları ve son ödemeler bu yüzden eksik olabilir.</p>
                            <p-button
                                class="mt-3"
                                label="Finansı tekrar dene"
                                icon="pi pi-refresh"
                                size="small"
                                severity="secondary"
                                (onClick)="reload()"
                                [attr.aria-label]="'Finans bolumunu tekrar dene'"
                            />
                        </div>
                    </div>
                } @else if (canViewFinance(d) && d.finance.data) {
                    <div class="col-span-12 sm:col-span-6 xl:col-span-2">
                        <div class="card mb-0">
                            <span class="block text-muted-color font-medium mb-4">Bugün alınan ödeme</span>
                            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ financeMoney(d.finance.data.todayTotalPaid) }}</div>
                        </div>
                    </div>
                    <div class="col-span-12 sm:col-span-6 xl:col-span-2">
                        <div class="card mb-0">
                            <span class="block text-muted-color font-medium mb-4">Bu hafta alınan ödeme</span>
                            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ financeMoney(d.finance.data.weekTotalPaid) }}</div>
                        </div>
                    </div>
                    <div class="col-span-12 sm:col-span-6 xl:col-span-2">
                        <div class="card mb-0">
                            <span class="block text-muted-color font-medium mb-4">Bu ay alınan ödeme</span>
                            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ financeMoney(d.finance.data.monthTotalPaid) }}</div>
                        </div>
                    </div>
                    <div class="col-span-12 sm:col-span-6 xl:col-span-2">
                        <div class="card mb-0">
                            <span class="block text-muted-color font-medium mb-4">Bugün ödeme sayısı</span>
                            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ metricCount(d.finance.data.todayPaymentsCount) }}</div>
                        </div>
                    </div>
                    <div class="col-span-12 sm:col-span-6 xl:col-span-2">
                        <div class="card mb-0">
                            <span class="block text-muted-color font-medium mb-4">Bu hafta ödeme sayısı</span>
                            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ metricCount(d.finance.data.weekPaymentsCount) }}</div>
                        </div>
                    </div>
                    <div class="col-span-12 sm:col-span-6 xl:col-span-2">
                        <div class="card mb-0">
                            <span class="block text-muted-color font-medium mb-4">Bu ay ödeme sayısı</span>
                            <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">{{ metricCount(d.finance.data.monthPaymentsCount) }}</div>
                        </div>
                    </div>
                }

                @if (d.summary.error) {
                    <div class="col-span-12">
                        <div class="card mb-0">
                            <p class="text-red-500 m-0" role="alert">{{ d.summary.error }}</p>
                            <p class="text-muted-color text-sm mt-2 mb-0">Üst sayaçlar bu yüzden eksik olabilir.</p>
                            <p-button
                                class="mt-3"
                                label="Özeti tekrar dene"
                                icon="pi pi-refresh"
                                size="small"
                                severity="secondary"
                                (onClick)="reload()"
                                [attr.aria-label]="'Ozet bolumunu tekrar dene'"
                            />
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
                        <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center mb-4">
                            <h5 class="mt-0 mb-0">Bugünkü randevular</h5>
                            <a routerLink="/panel/appointments" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (listsLoading()) {
                            <app-loading-state message="Randevu listesi yükleniyor…" />
                        } @else if (d.todayAppointments.error) {
                            <p class="text-red-500 m-0" role="alert">{{ d.todayAppointments.error }}</p>
                        } @else if (d.todayAppointments.data.length === 0) {
                            <app-empty-state message="Bugün için randevu yok." hint="Tarih filtresi yerel güne göredir." />
                        } @else {
                            <ul class="lg:hidden list-none m-0 p-0 flex flex-col gap-4">
                                @for (row of d.todayAppointments.data; track row.id) {
                                    <li
                                        class="min-w-0 flex flex-col gap-1 rounded-lg border border-surface-200 dark:border-surface-700 p-3"
                                    >
                                        <div class="text-muted-color text-sm">{{ formatTime(row.scheduledAtUtc) }}</div>
                                        <div class="min-w-0 break-words font-medium text-surface-900 dark:text-surface-0">
                                            @if (row.clientId) {
                                                <a [routerLink]="['/panel/clients', row.clientId]" class="text-primary font-medium no-underline">{{
                                                    row.clientName
                                                }}</a>
                                            } @else {
                                                {{ row.clientName }}
                                            }
                                        </div>
                                        <div class="min-w-0 break-words text-sm text-surface-700 dark:text-surface-200">
                                            @if (row.petId) {
                                                <a [routerLink]="['/panel/pets', row.petId]" class="text-primary font-medium no-underline">{{ row.petName }}</a>
                                            } @else {
                                                {{ row.petName }}
                                            }
                                        </div>
                                        <div class="flex flex-wrap items-center gap-2">
                                            <app-status-tag [label]="apptStatusLabel(row.status)" [severity]="apptStatusSeverity(row.status)" />
                                        </div>
                                        <div class="mt-2 pt-2 border-t border-surface-200 dark:border-surface-700">
                                            <a
                                                [routerLink]="['/panel/appointments', row.id]"
                                                class="text-primary font-medium no-underline text-sm inline-flex py-1"
                                                >Detay →</a
                                            >
                                        </div>
                                    </li>
                                }
                            </ul>
                            <div class="hidden lg:block">
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
                            </div>
                        }
                    </div>
                </div>

                <div class="col-span-12 xl:col-span-6">
                    <div class="card h-full">
                        <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center mb-4">
                            <h5 class="mt-0 mb-0">Yaklaşan aşılar</h5>
                            <a routerLink="/panel/vaccinations" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (listsLoading()) {
                            <app-loading-state message="Aşı listesi yükleniyor…" />
                        } @else if (d.upcomingVaccinations.error) {
                            <p class="text-red-500 m-0" role="alert">{{ d.upcomingVaccinations.error }}</p>
                        } @else if (d.upcomingVaccinations.data.length === 0) {
                            <app-empty-state message="Önümüzdeki dönem için uygun aşı kaydı yok." />
                        } @else {
                            <ul class="lg:hidden list-none m-0 p-0 flex flex-col gap-4">
                                @for (row of d.upcomingVaccinations.data; track row.id) {
                                    <li
                                        class="min-w-0 flex flex-col gap-1 rounded-lg border border-surface-200 dark:border-surface-700 p-3"
                                    >
                                        <div class="text-muted-color text-sm">{{ formatDate(row.dueAtUtc) }}</div>
                                        <div class="min-w-0 break-words font-medium text-surface-900 dark:text-surface-0">{{ row.vaccineName }}</div>
                                        <div class="min-w-0 break-words text-sm text-surface-700 dark:text-surface-200">
                                            @if (row.petId) {
                                                <a [routerLink]="['/panel/pets', row.petId]" class="text-primary font-medium no-underline">{{ row.petName }}</a>
                                            } @else {
                                                {{ row.petName }}
                                            }
                                        </div>
                                        <div class="mt-2 pt-2 border-t border-surface-200 dark:border-surface-700">
                                            <a
                                                [routerLink]="['/panel/vaccinations', row.id]"
                                                class="text-primary font-medium no-underline text-sm inline-flex py-1"
                                                >Detay →</a
                                            >
                                        </div>
                                    </li>
                                }
                            </ul>
                            <div class="hidden lg:block">
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
                            </div>
                        }
                    </div>
                </div>

                <div class="col-span-12 xl:col-span-6">
                    <div class="card h-full">
                        <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center mb-4">
                            <h5 class="mt-0 mb-0">Son muayeneler</h5>
                            <a routerLink="/panel/examinations" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (listsLoading()) {
                            <app-loading-state message="Muayene listesi yükleniyor…" />
                        } @else if (d.recentExaminations.error) {
                            <p class="text-red-500 m-0" role="alert">{{ d.recentExaminations.error }}</p>
                        } @else if (d.recentExaminations.data.length === 0) {
                            <app-empty-state message="Muayene kaydı yok." />
                        } @else {
                            <ul class="lg:hidden list-none m-0 p-0 flex flex-col gap-4">
                                @for (row of d.recentExaminations.data; track row.id) {
                                    <li
                                        class="min-w-0 flex flex-col gap-1 rounded-lg border border-surface-200 dark:border-surface-700 p-3"
                                    >
                                        <div class="text-muted-color text-sm break-words">{{ formatDateTime(row.examinedAtUtc) }}</div>
                                        <div class="min-w-0 break-words font-medium text-surface-900 dark:text-surface-0">{{ row.petName }}</div>
                                        <div class="min-w-0 break-words text-sm text-surface-700 dark:text-surface-200">{{ row.clientName }}</div>
                                        <div class="mt-2 pt-2 border-t border-surface-200 dark:border-surface-700">
                                            <a
                                                [routerLink]="['/panel/examinations', row.id]"
                                                class="text-primary font-medium no-underline text-sm inline-flex py-1"
                                                >Detay →</a
                                            >
                                        </div>
                                    </li>
                                }
                            </ul>
                            <div class="hidden lg:block">
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
                            </div>
                        }
                    </div>
                </div>

                @if (canViewFinance(d)) {
                    <div class="col-span-12">
                        <div class="card">
                            <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center mb-4">
                                <h5 class="mt-0 mb-0">Son ödemeler</h5>
                                <a routerLink="/panel/payments" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                            </div>
                            @if (d.finance.error) {
                                <p class="text-red-500 m-0" role="alert">{{ d.finance.error }}</p>
                                <p-button
                                    class="mt-3"
                                    label="Finansı tekrar dene"
                                    icon="pi pi-refresh"
                                    size="small"
                                    severity="secondary"
                                    (onClick)="reload()"
                                />
                            } @else if (!d.finance.data || d.finance.data.recentPayments.length === 0) {
                                <app-empty-state message="Ödeme kaydı yok." hint="İlk ödeme kaydı için ödeme ekranına gidin." />
                            } @else {
                                <ul class="lg:hidden list-none m-0 p-0 flex flex-col gap-4">
                                    @for (row of d.finance.data.recentPayments; track row.id) {
                                        <li
                                            class="min-w-0 flex flex-col gap-1 rounded-lg border border-surface-200 dark:border-surface-700 p-3"
                                        >
                                            <div class="text-muted-color text-sm break-words">{{ formatPaidAtUtc(row.paidAtUtc) }}</div>
                                            <div class="min-w-0 break-words font-medium text-surface-900 dark:text-surface-0">
                                                @if (row.clientId) {
                                                    <a [routerLink]="['/panel/clients', row.clientId]" class="text-primary font-medium no-underline">{{ row.clientName }}</a>
                                                } @else {
                                                    {{ row.clientName }}
                                                }
                                            </div>
                                            @if (row.petId || (row.petName && row.petName.trim())) {
                                                <div class="min-w-0 break-words text-sm text-surface-700 dark:text-surface-200">
                                                    @if (row.petId) {
                                                        <a [routerLink]="['/panel/pets', row.petId]" class="text-primary font-medium no-underline">{{ row.petName }}</a>
                                                    } @else {
                                                        {{ row.petName }}
                                                    }
                                                </div>
                                            }
                                            <div class="min-w-0 break-words text-surface-900 dark:text-surface-0 font-medium">{{ money(row.amount, row.currency) }}</div>
                                            <div class="text-sm text-muted-color break-words">{{ payMethodLabel(row.method) }}</div>
                                            <div class="mt-2 pt-2 border-t border-surface-200 dark:border-surface-700">
                                                <a
                                                    [routerLink]="['/panel/payments', row.id]"
                                                    class="text-primary font-medium no-underline text-sm inline-flex py-1"
                                                    >Detay →</a
                                                >
                                            </div>
                                        </li>
                                    }
                                </ul>
                                <div class="hidden lg:block">
                                    <p-table [value]="d.finance.data.recentPayments" [tableStyle]="{ 'min-width': '100%' }" [paginator]="false">
                                        <ng-template #header>
                                            <tr>
                                                <th>Tarih</th>
                                                <th>Müşteri</th>
                                                <th>Hayvan</th>
                                                <th>Tutar</th>
                                                <th>Yöntem</th>
                                                <th></th>
                                            </tr>
                                        </ng-template>
                                        <ng-template #body let-row>
                                            <tr>
                                                <td>{{ formatPaidAtUtc(row.paidAtUtc) }}</td>
                                                <td>
                                                    @if (row.clientId) {
                                                        <a [routerLink]="['/panel/clients', row.clientId]" class="text-primary font-medium no-underline">{{ row.clientName }}</a>
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
                                                <td>{{ money(row.amount, row.currency) }}</td>
                                                <td>{{ payMethodLabel(row.method) }}</td>
                                                <td>
                                                    <a [routerLink]="['/panel/payments', row.id]" class="text-primary font-medium no-underline text-sm">Detay</a>
                                                </td>
                                            </tr>
                                        </ng-template>
                                    </p-table>
                                </div>
                            }
                        </div>
                    </div>
                }

                <div class="col-span-12">
                    @if (d.summary.error || !d.summary.data) {
                        <div class="card">
                            <h5 class="mt-0 mb-4">Son müşteri / hayvan</h5>
                            <app-empty-state message="Özet yüklenemediği için son kayıtlar gösterilemiyor." />
                        </div>
                    } @else {
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div class="card mb-0 h-full">
                                <h5 class="mt-0 mb-4">Son müşteriler</h5>
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
                                                <td>{{ formatClientPhoneForDisplay(row.phone) }}</td>
                                                <td>
                                                    <a [routerLink]="['/panel/clients', row.id]" class="text-primary font-medium no-underline text-sm">Detay</a>
                                                </td>
                                            </tr>
                                        </ng-template>
                                    </p-table>
                                }
                            </div>
                            <div class="card mb-0 h-full">
                                <h5 class="mt-0 mb-4">Son hayvanlar</h5>
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

                <div class="col-span-12">
                    <p-button
                        [label]="copy.buttonRefresh"
                        icon="pi pi-refresh"
                        severity="secondary"
                        (onClick)="reload()"
                        [disabled]="loading() || listsLoading()"
                    />
                </div>
            </div>
        } @else {
            <div class="card">
                <p class="m-0 mb-4 text-muted-color">Özet verisi alınamadı.</p>
                <p-button
                    [label]="copy.buttonRefresh"
                    icon="pi pi-refresh"
                    (onClick)="reload()"
                    [disabled]="loading() || listsLoading()"
                />
            </div>
        }
        }
    `
})
export class DashboardPageComponent implements OnInit {
    private readonly dashboardService = inject(DashboardService);
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    readonly copy = PANEL_COPY;
    readonly formatClientPhoneForDisplay = formatClientPhoneForDisplay;

    readonly loading = signal(true);
    /** Faz 2: randevu / aşı / muayene listeleri gelene kadar. */
    readonly listsLoading = signal(false);
    readonly dash = signal<DashboardOperationalVm | null>(null);

    readonly formatDate = (v: string | null) => formatDateDisplay(v);
    readonly formatDateTime = (v: string | null) => formatDateTimeDisplay(v);
    readonly formatPaidAtUtc = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly formatTime = (v: string | null) => formatTimeDisplay(v);
    readonly apptStatusLabel = appointmentStatusLabel;
    readonly apptStatusSeverity = appointmentStatusSeverity;
    readonly payMethodLabel = paymentMethodLabel;

    /** Guard dışı kenar durumlarında sonsuz yükleme göstermemek için. */
    readonly clinicContextOk = signal(false);

    readonly selectClinicQueryParams = { returnUrl: panelReturnUrlOrDefault(this.router.url) };

    ngOnInit(): void {
        const ok = this.auth.hasSelectedClinic();
        this.clinicContextOk.set(ok);
        if (!ok) {
            this.loading.set(false);
            this.listsLoading.set(false);
            this.dash.set(null);
            return;
        }
        this.reload();
    }

    pageDescription(): string {
        if (!this.clinicContextOk()) {
            return this.copy.dashboardNeedClinicHint;
        }
        const label = this.auth.activeClinicLabel()?.trim();
        const who = label ? `“${label}”` : 'Seçili klinik';
        return `${who} için operasyon özeti. Özet ve finans kartları önce; randevu, aşı ve muayene listeleri ardından yüklenir.`;
    }

    reload(): void {
        if (!this.clinicContextOk()) {
            return;
        }
        this.loading.set(true);
        this.listsLoading.set(false);
        this.dashboardService
            .loadDashboardSummariesPhase()
            .pipe(
                tap((summaries) => {
                    this.dash.set(dashboardVmWithPendingLists(summaries));
                    this.loading.set(false);
                    this.listsLoading.set(true);
                }),
                switchMap((summaries) =>
                    this.dashboardService.loadDashboardListsPhase().pipe(
                        map((lists) => mergeDashboardListPhaseIntoVm(summaries, lists))
                    )
                )
            )
            .subscribe({
                next: (full) => {
                    this.dash.set(full);
                    this.listsLoading.set(false);
                },
                error: () => {
                    this.loading.set(false);
                    this.listsLoading.set(false);
                }
            });
    }

    metricCount(n: number | null | undefined): string | number {
        if (n === undefined || n === null) {
            return '—';
        }
        return n;
    }

    appointmentTrendPoints(d: DashboardOperationalVm): readonly DashboardTrendDayVm[] {
        return d.summary.data?.last7DaysAppointmentsTrend ?? buildSevenDayTrendPoints([]);
    }

    paidTrendPoints(d: DashboardOperationalVm): readonly DashboardTrendDayVm[] {
        return d.finance.data?.last7DaysPaidTrend ?? buildSevenDayTrendPoints([]);
    }

    canViewFinance(d: DashboardOperationalVm): boolean {
        return d.canViewFinance;
    }

    canShowPaymentsQuickAction(): boolean {
        const d = this.dash();
        if (d) {
            return d.canViewFinance;
        }
        return this.auth.hasOperationClaim('Payments.Read');
    }

    canOpenAppointments(): boolean {
        return this.hasAnyClaim('Appointments.Read', 'Appointments.Create');
    }

    canOpenClients(): boolean {
        return this.hasAnyClaim('Clients.Read');
    }

    canOpenPets(): boolean {
        return this.hasAnyClaim('Pets.Read');
    }

    severityLabel(severity: DashboardActionSeverity): string {
        if (severity === 'danger') {
            return 'Kritik';
        }
        if (severity === 'warning') {
            return 'Dikkat';
        }
        return 'Bilgi';
    }

    statusSeverity(severity: DashboardActionSeverity): StatusTagSeverity {
        if (severity === 'warning') {
            return 'warn';
        }
        return severity;
    }

    hasTopRightOperationalPanel(d: DashboardOperationalVm): boolean {
        return d.alerts.length > 0 || (d.canViewOperationalAlerts && d.actionItems.length > 0) || !!d.capabilities.error || !!d.operationalAlerts.error;
    }

    todayAppointmentsMetric(d: DashboardOperationalVm): number | null {
        // "Bugünkü randevular" kartı ve tablosu aynı kavramı göstersin:
        // öncelik tablo verisi (aynı source/filter), fallback summary sayacı.
        if (!d.todayAppointments.error) {
            return d.todayAppointments.data.length;
        }
        return d.summary.data?.todayAppointmentsCount ?? null;
    }

    money(amount: number | null, currency: string | null | undefined): string {
        return formatMoney(amount, currency?.trim() ? currency.trim() : 'TRY');
    }

    /** Dashboard finans kartları — backend toplamları TRY (İstanbul) varsayımı. */
    financeMoney(amount: number | null): string {
        return formatMoney(amount, 'TRY');
    }

    petSpeciesText(row: DashboardRecentPetDto): string {
        const species = row.speciesName?.trim() || row.species?.trim() || '-';
        const breed = row.breedName?.trim() || row.breed?.trim() || '';
        return breed ? `${species} · ${breed}` : species;
    }

    private hasAnyClaim(...claims: readonly string[]): boolean {
        const d = this.dash();
        if (d?.capabilities.data.isOwner || d?.capabilities.data.isAdmin) {
            return true;
        }
        return claims.some((claim) => this.auth.hasOperationClaim(claim));
    }
}
