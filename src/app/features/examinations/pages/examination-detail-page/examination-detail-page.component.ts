import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import { appointmentTypeDisplayLabel } from '@/app/features/appointments/utils/appointment-type.utils';
import type {
    ExaminationDetailVm,
    ExaminationListItemVm,
    ExaminationRelatedHospitalizationItemVm,
    ExaminationRelatedSummaryVm
} from '@/app/features/examinations/models/examination-vm.model';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import { paymentMethodLabel } from '@/app/features/payments/utils/payment-method.utils';
import { DetailRelatedSummariesService } from '@/app/shared/panel/detail-related-summaries.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatDateDisplay, formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { EMPTY, switchMap } from 'rxjs';

@Component({
    selector: 'app-examination-detail-page',
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
        <a routerLink="/panel/examinations" class="text-primary font-medium no-underline inline-block mb-4">← Muayene listesine dön</a>

        @if (showSavedBanner()) {
            <p class="mb-4 m-0 text-sm font-medium">Muayene kaydedildi.</p>
        }

        @if (loading()) {
            <app-loading-state message="Muayene yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (exam()) {
            <app-page-header
                title="Muayene"
                subtitle="Klinik"
                [description]="formatDateTime(exam()!.examinedAtUtc)"
            >
                <a
                    actions
                    [routerLink]="['/panel/examinations', exam()!.id, 'edit']"
                    pButton
                    type="button"
                    label="Düzenle"
                    icon="pi pi-pencil"
                    class="p-button-secondary"
                ></a>
                @if (exam()!.clientId?.trim() && exam()!.petId?.trim()) {
                    <div actions class="flex flex-wrap gap-2">
                        <a
                            [routerLink]="['/panel/treatments/new']"
                            [queryParams]="{
                                clientId: exam()!.clientId,
                                petId: exam()!.petId,
                                examinationId: exam()!.id
                            }"
                            pButton
                            type="button"
                            label="Tedavi Oluştur"
                            icon="pi pi-plus"
                            class="p-button-secondary"
                        ></a>
                        <a
                            [routerLink]="['/panel/prescriptions/new']"
                            [queryParams]="{
                                clientId: exam()!.clientId,
                                petId: exam()!.petId,
                                examinationId: exam()!.id
                            }"
                            pButton
                            type="button"
                            label="Reçete Oluştur"
                            icon="pi pi-file-edit"
                            class="p-button-secondary"
                        ></a>
                        <a
                            [routerLink]="['/panel/vaccinations/new']"
                            [queryParams]="{
                                clientId: exam()!.clientId,
                                petId: exam()!.petId,
                                examinationId: exam()!.id
                            }"
                            pButton
                            type="button"
                            label="Aşı Oluştur"
                            icon="pi pi-shield"
                            class="p-button-secondary"
                        ></a>
                        <a
                            [routerLink]="['/panel/lab-results/new']"
                            [queryParams]="{
                                clientId: exam()!.clientId,
                                petId: exam()!.petId,
                                examinationId: exam()!.id
                            }"
                            pButton
                            type="button"
                            label="Lab Sonucu Oluştur"
                            icon="pi pi-chart-bar"
                            class="p-button-secondary"
                        ></a>
                        <a
                            [routerLink]="['/panel/hospitalizations/new']"
                            [queryParams]="{
                                clientId: exam()!.clientId,
                                petId: exam()!.petId,
                                examinationId: exam()!.id
                            }"
                            pButton
                            type="button"
                            label="Yatış Başlat"
                            icon="pi pi-building"
                            class="p-button-secondary"
                        ></a>
                        <a
                            [routerLink]="['/panel/payments/new']"
                            [queryParams]="{
                                clientId: exam()!.clientId,
                                petId: exam()!.petId,
                                examinationId: exam()!.id
                            }"
                            pButton
                            type="button"
                            label="Ödeme Oluştur"
                            icon="pi pi-wallet"
                            class="p-button-secondary"
                        ></a>
                    </div>
                }
            </app-page-header>

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Genel bilgiler</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Muayene tarihi</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDateTime(exam()!.examinedAtUtc) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Oluşturulma</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDate(exam()!.createdAtUtc) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Güncellenme</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDate(exam()!.updatedAtUtc) }}</dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Müşteri / hayvan</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Müşteri</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                @if (exam()!.clientId) {
                                    <a [routerLink]="['/panel/clients', exam()!.clientId]" class="text-primary font-medium no-underline">{{ exam()!.clientName }}</a>
                                } @else {
                                    {{ exam()!.clientName }}
                                }
                            </dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Hayvan</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                @if (exam()!.petId) {
                                    <a [routerLink]="['/panel/pets', exam()!.petId]" class="text-primary font-medium no-underline">{{ exam()!.petName }}</a>
                                } @else {
                                    {{ exam()!.petName }}
                                }
                            </dd>
                        </dl>
                    </div>
                </div>

                <div class="col-span-12">
                    <div class="card">
                        <h4 class="mt-0 mb-6 text-xl font-semibold">Muayene özeti</h4>
                        <div class="mb-6 pb-6 border-b border-surface-200 dark:border-surface-700 last:mb-0 last:pb-0 last:border-b-0">
                            <h5 class="mt-0 mb-4">Ziyaret sebebi</h5>
                            @if (exam()!.visitReason === emptyMark) {
                                <app-empty-state message="Ziyaret sebebi girilmemiş." />
                            } @else {
                                <p class="m-0 whitespace-pre-wrap">{{ exam()!.visitReason }}</p>
                            }
                        </div>
                        <div class="mb-6 pb-6 border-b border-surface-200 dark:border-surface-700 last:mb-0 last:pb-0 last:border-b-0">
                            <h5 class="mt-0 mb-4">Bulgular</h5>
                            @if (exam()!.findings === emptyMark) {
                                <app-empty-state message="Bulgu kaydı yok." />
                            } @else {
                                <p class="m-0 whitespace-pre-wrap">{{ exam()!.findings }}</p>
                            }
                        </div>
                        <div class="mb-6 pb-6 border-b border-surface-200 dark:border-surface-700 last:mb-0 last:pb-0 last:border-b-0">
                            <h5 class="mt-0 mb-4">Değerlendirme</h5>
                            @if (exam()!.assessment === emptyMark) {
                                <app-empty-state message="Değerlendirme girilmemiş." />
                            } @else {
                                <p class="m-0 whitespace-pre-wrap">{{ exam()!.assessment }}</p>
                            }
                        </div>
                        <div>
                            <h5 class="mt-0 mb-4">Notlar</h5>
                            @if (exam()!.notes === emptyMark) {
                                <app-empty-state message="Not yok." />
                            } @else {
                                <p class="m-0 whitespace-pre-wrap">{{ exam()!.notes }}</p>
                            }
                        </div>
                    </div>
                </div>

                <div class="col-span-12">
                    <h4 class="mt-0 mb-4 text-xl font-semibold">İlgili kayıtlar</h4>
                </div>
                @if (relatedSummaryLoading()) {
                    <div class="col-span-12">
                        <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                    </div>
                } @else if (relatedSummaryError()) {
                    <div class="col-span-12">
                        <div class="card">
                            <app-error-state [detail]="relatedSummaryError()!" (retry)="retryRelatedSummary()" />
                        </div>
                    </div>
                } @else if (relatedSummary()) {
                    <div class="col-span-12 lg:col-span-6">
                        <div class="card">
                            <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center mb-4">
                                <h5 class="mt-0 mb-0">Bağlı tedaviler</h5>
                                <a routerLink="/panel/treatments" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                            </div>
                            @if (relatedSummary()!.treatments.length === 0) {
                                <app-empty-state [message]="copy.listEmptyMessage" />
                            } @else {
                                <ul class="list-none m-0 p-0">
                                    @for (row of relatedSummary()!.treatments; track row.id) {
                                        <li
                                            class="mb-3 last:mb-0 min-w-0 max-lg:rounded-border max-lg:border max-lg:border-surface-200 max-lg:dark:border-surface-700 max-lg:p-3 max-lg:shadow-sm"
                                        >
                                            <div class="text-muted-color text-sm mb-1.5 lg:hidden">{{ formatDt(row.treatmentDateUtc) }}</div>
                                            <div class="hidden lg:flex lg:flex-wrap lg:gap-2 lg:justify-between lg:items-baseline">
                                                <span class="text-muted-color text-sm min-w-0">{{ formatDt(row.treatmentDateUtc) }}</span>
                                                <a [routerLink]="['/panel/treatments', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                            </div>
                                            <div class="font-medium min-w-0 break-words">{{ row.title }}</div>
                                            @if (row.clinicName) {
                                                <div class="text-muted-color text-sm min-w-0 break-words">{{ row.clinicName }}</div>
                                            }
                                            <div class="flex justify-end mt-2 pt-2 border-t border-surface-200 dark:border-surface-700 lg:hidden">
                                                <a [routerLink]="['/panel/treatments', row.id]" class="text-primary font-medium no-underline text-sm py-1">Detay →</a>
                                            </div>
                                        </li>
                                    }
                                </ul>
                            }
                        </div>
                    </div>
                    <div class="col-span-12 lg:col-span-6">
                        <div class="card">
                            <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center mb-4">
                                <h5 class="mt-0 mb-0">Bağlı reçeteler</h5>
                                <a routerLink="/panel/prescriptions" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                            </div>
                            @if (relatedSummary()!.prescriptions.length === 0) {
                                <app-empty-state [message]="copy.listEmptyMessage" />
                            } @else {
                                <ul class="list-none m-0 p-0">
                                    @for (row of relatedSummary()!.prescriptions; track row.id) {
                                        <li
                                            class="mb-3 last:mb-0 min-w-0 max-lg:rounded-border max-lg:border max-lg:border-surface-200 max-lg:dark:border-surface-700 max-lg:p-3 max-lg:shadow-sm"
                                        >
                                            <div class="text-muted-color text-sm mb-1.5 lg:hidden">{{ formatDt(row.prescribedAtUtc) }}</div>
                                            <div class="hidden lg:flex lg:flex-wrap lg:gap-2 lg:justify-between lg:items-baseline">
                                                <span class="text-muted-color text-sm min-w-0">{{ formatDt(row.prescribedAtUtc) }}</span>
                                                <a [routerLink]="['/panel/prescriptions', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                            </div>
                                            <div class="font-medium min-w-0 break-words">{{ row.title }}</div>
                                            @if (row.clinicName) {
                                                <div class="text-muted-color text-sm min-w-0 break-words">{{ row.clinicName }}</div>
                                            }
                                            <div class="flex justify-end mt-2 pt-2 border-t border-surface-200 dark:border-surface-700 lg:hidden">
                                                <a [routerLink]="['/panel/prescriptions', row.id]" class="text-primary font-medium no-underline text-sm py-1">Detay →</a>
                                            </div>
                                        </li>
                                    }
                                </ul>
                            }
                        </div>
                    </div>
                    <div class="col-span-12 lg:col-span-6">
                        <div class="card">
                            <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center mb-4">
                                <h5 class="mt-0 mb-0">Bağlı lab sonuçları</h5>
                                <a routerLink="/panel/lab-results" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                            </div>
                            @if (relatedSummary()!.labResults.length === 0) {
                                <app-empty-state [message]="copy.listEmptyMessage" />
                            } @else {
                                <ul class="list-none m-0 p-0">
                                    @for (row of relatedSummary()!.labResults; track row.id) {
                                        <li
                                            class="mb-3 last:mb-0 min-w-0 max-lg:rounded-border max-lg:border max-lg:border-surface-200 max-lg:dark:border-surface-700 max-lg:p-3 max-lg:shadow-sm"
                                        >
                                            <div class="text-muted-color text-sm mb-1.5 lg:hidden">{{ formatDt(row.resultDateUtc) }}</div>
                                            <div class="hidden lg:flex lg:flex-wrap lg:gap-2 lg:justify-between lg:items-baseline">
                                                <span class="text-muted-color text-sm min-w-0">{{ formatDt(row.resultDateUtc) }}</span>
                                                <a [routerLink]="['/panel/lab-results', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                            </div>
                                            <div class="font-medium min-w-0 break-words">{{ row.testName }}</div>
                                            @if (row.clinicName) {
                                                <div class="text-muted-color text-sm min-w-0 break-words">{{ row.clinicName }}</div>
                                            }
                                            <div class="flex justify-end mt-2 pt-2 border-t border-surface-200 dark:border-surface-700 lg:hidden">
                                                <a [routerLink]="['/panel/lab-results', row.id]" class="text-primary font-medium no-underline text-sm py-1">Detay →</a>
                                            </div>
                                        </li>
                                    }
                                </ul>
                            }
                        </div>
                    </div>
                    <div class="col-span-12 lg:col-span-6">
                        <div class="card">
                            <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center mb-4">
                                <h5 class="mt-0 mb-0">Bağlı yatışlar</h5>
                                <a routerLink="/panel/hospitalizations" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                            </div>
                            @if (relatedSummary()!.hospitalizations.length === 0) {
                                <app-empty-state [message]="copy.listEmptyMessage" />
                            } @else {
                                <ul class="list-none m-0 p-0">
                                    @for (row of relatedSummary()!.hospitalizations; track row.id) {
                                        <li
                                            class="mb-3 last:mb-0 min-w-0 max-lg:rounded-border max-lg:border max-lg:border-surface-200 max-lg:dark:border-surface-700 max-lg:p-3 max-lg:shadow-sm"
                                        >
                                            <div class="text-muted-color text-sm mb-1.5 lg:hidden">{{ formatDt(row.admittedAtUtc) }}</div>
                                            <div class="hidden lg:flex lg:flex-wrap lg:gap-2 lg:justify-between lg:items-baseline">
                                                <span class="text-muted-color text-sm min-w-0">{{ formatDt(row.admittedAtUtc) }}</span>
                                                <a [routerLink]="['/panel/hospitalizations', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                            </div>
                                            <div class="font-medium min-w-0 break-words">{{ row.reason }}</div>
                                            <div class="text-muted-color text-sm min-w-0 break-words">{{ hospitalizationStatusLine(row) }}</div>
                                            @if (row.clinicName) {
                                                <div class="text-muted-color text-sm min-w-0 break-words">{{ row.clinicName }}</div>
                                            }
                                            <div class="flex justify-end mt-2 pt-2 border-t border-surface-200 dark:border-surface-700 lg:hidden">
                                                <a [routerLink]="['/panel/hospitalizations', row.id]" class="text-primary font-medium no-underline text-sm py-1">Detay →</a>
                                            </div>
                                        </li>
                                    }
                                </ul>
                            }
                        </div>
                    </div>
                    <div class="col-span-12 lg:col-span-6">
                        <div class="card">
                            <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center mb-4">
                                <h5 class="mt-0 mb-0">Bağlı ödemeler</h5>
                                <a routerLink="/panel/payments" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                            </div>
                            @if (relatedSummary()!.payments.length === 0) {
                                <app-empty-state [message]="copy.listEmptyMessage" />
                            } @else {
                                <ul class="list-none m-0 p-0">
                                    @for (row of relatedSummary()!.payments; track row.id) {
                                        <li
                                            class="mb-3 last:mb-0 min-w-0 max-lg:rounded-border max-lg:border max-lg:border-surface-200 max-lg:dark:border-surface-700 max-lg:p-3 max-lg:shadow-sm"
                                        >
                                            <div class="lg:hidden space-y-2 min-w-0">
                                                <div class="text-muted-color text-sm">{{ formatDt(row.paidAtUtc) }}</div>
                                                <div class="font-semibold text-base tabular-nums text-surface-900 dark:text-surface-0 min-w-0 break-words">
                                                    {{ money(row.amount, row.currency) }}
                                                </div>
                                                <div class="text-sm text-muted-color min-w-0 break-words">{{ payMethodLabel(row.method) }}</div>
                                                @if (row.clinicName) {
                                                    <div class="text-muted-color text-sm min-w-0 break-words">{{ row.clinicName }}</div>
                                                }
                                                <div class="flex justify-end pt-2 mt-1 border-t border-surface-200 dark:border-surface-700">
                                                    <a [routerLink]="['/panel/payments', row.id]" class="text-primary font-medium no-underline text-sm py-1">Detay →</a>
                                                </div>
                                            </div>
                                            <div class="hidden lg:block space-y-1 min-w-0">
                                                <div class="flex flex-wrap gap-2 justify-between items-baseline">
                                                    <span class="text-muted-color text-sm min-w-0">{{ formatDt(row.paidAtUtc) }}</span>
                                                    <a [routerLink]="['/panel/payments', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                                </div>
                                                <div class="font-medium min-w-0 break-words">{{ money(row.amount, row.currency) }} · {{ payMethodLabel(row.method) }}</div>
                                                @if (row.clinicName) {
                                                    <div class="text-muted-color text-sm min-w-0 break-words">{{ row.clinicName }}</div>
                                                }
                                            </div>
                                        </li>
                                    }
                                </ul>
                            }
                        </div>
                    </div>
                }
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center mb-4">
                            <h5 class="mt-0 mb-0">Aynı hayvana ait muayeneler</h5>
                            <a routerLink="/panel/examinations" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (!exam()!.petId) {
                            <app-empty-state message="Hayvan bilgisi yok; liste gösterilemiyor." />
                        } @else if (sibLoading()) {
                            <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                        } @else if (sibError()) {
                            <p class="text-muted-color m-0">{{ sibError() }}</p>
                        } @else if (sibItems().length === 0) {
                            <app-empty-state message="Başka muayene kaydı yok." />
                        } @else {
                            <ul class="list-none m-0 p-0">
                                @for (row of sibItems(); track row.id) {
                                    <li
                                        class="mb-3 last:mb-0 min-w-0 max-lg:rounded-border max-lg:border max-lg:border-surface-200 max-lg:dark:border-surface-700 max-lg:p-3 max-lg:shadow-sm"
                                    >
                                        <div class="text-muted-color text-sm mb-1.5 lg:hidden">{{ formatDt(row.examinedAtUtc) }}</div>
                                        <div class="hidden lg:flex lg:flex-wrap lg:gap-2 lg:justify-between lg:items-baseline">
                                            <span class="text-muted-color text-sm min-w-0">{{ formatDt(row.examinedAtUtc) }}</span>
                                            <a [routerLink]="['/panel/examinations', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                        </div>
                                        <div class="font-medium min-w-0 break-words">{{ row.visitReason }}</div>
                                        <div class="flex justify-end mt-2 pt-2 border-t border-surface-200 dark:border-surface-700 lg:hidden">
                                            <a [routerLink]="['/panel/examinations', row.id]" class="text-primary font-medium no-underline text-sm py-1">Detay →</a>
                                        </div>
                                    </li>
                                }
                            </ul>
                        }
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center mb-4">
                            <h5 class="mt-0 mb-0">Randevular (aynı hayvan)</h5>
                            <a routerLink="/panel/appointments" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (!exam()!.petId) {
                            <app-empty-state message="Hayvan bilgisi yok; liste gösterilemiyor." />
                        } @else if (apptLoading()) {
                            <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                        } @else if (apptError()) {
                            <p class="text-muted-color m-0">{{ apptError() }}</p>
                        } @else if (apptItems().length === 0) {
                            <app-empty-state message="Kayıt bulunamadı." />
                        } @else {
                            <ul class="list-none m-0 p-0">
                                @for (row of apptItems(); track row.id) {
                                    <li
                                        class="mb-3 last:mb-0 min-w-0 max-lg:rounded-border max-lg:border max-lg:border-surface-200 max-lg:dark:border-surface-700 max-lg:p-3 max-lg:shadow-sm"
                                    >
                                        <div class="text-muted-color text-sm mb-1.5 lg:hidden">{{ formatDt(row.scheduledAtUtc) }}</div>
                                        <div class="hidden lg:flex lg:flex-wrap lg:gap-2 lg:justify-between lg:items-baseline">
                                            <span class="text-muted-color text-sm min-w-0">{{ formatDt(row.scheduledAtUtc) }}</span>
                                            <a [routerLink]="['/panel/appointments', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                        </div>
                                        <div class="font-medium min-w-0 break-words">{{ typeDisplay(row.appointmentType, row.appointmentTypeName) }}</div>
                                        <div class="flex justify-end mt-2 pt-2 border-t border-surface-200 dark:border-surface-700 lg:hidden">
                                            <a [routerLink]="['/panel/appointments', row.id]" class="text-primary font-medium no-underline text-sm py-1">Detay →</a>
                                        </div>
                                    </li>
                                }
                            </ul>
                        }
                    </div>
                </div>
            </div>
        }
    `
})
export class ExaminationDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly examinationsService = inject(ExaminationsService);
    private readonly related = inject(DetailRelatedSummariesService);

    readonly copy = PANEL_COPY;
    readonly showSavedBanner = signal(false);

    /** Mapper boş metin için kullandığı EM ile aynı. */
    readonly emptyMark = '—';

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly exam = signal<ExaminationDetailVm | null>(null);

    readonly relatedSummaryLoading = signal(false);
    readonly relatedSummaryError = signal<string | null>(null);
    readonly relatedSummary = signal<ExaminationRelatedSummaryVm | null>(null);

    readonly sibLoading = signal(false);
    readonly sibError = signal<string | null>(null);
    readonly sibItems = signal<ExaminationListItemVm[]>([]);

    readonly apptLoading = signal(false);
    readonly apptError = signal<string | null>(null);
    readonly apptItems = signal<AppointmentListItemVm[]>([]);

    private lastId: string | null = null;

    readonly formatDate = (v: string | null) => formatDateDisplay(v);
    readonly formatDateTime = (v: string | null) => formatDateTimeDisplay(v);
    readonly formatDt = (v: string | null) => formatDateTimeDisplay(v);
    readonly typeDisplay = appointmentTypeDisplayLabel;
    readonly money = (amount: number | null, currency: string | null | undefined) =>
        formatMoney(amount, currency?.trim() ? currency.trim() : 'TRY');
    readonly payMethodLabel = paymentMethodLabel;

    hospitalizationStatusLine(row: ExaminationRelatedHospitalizationItemVm): string {
        if (row.dischargedAtUtc) {
            return `Çıkış: ${this.formatDt(row.dischargedAtUtc)}`;
        }
        if (row.isActive) {
            return 'Aktif yatış';
        }
        return 'Taburcu';
    }

    ngOnInit(): void {
        if (this.route.snapshot.queryParamMap.get('saved') === '1') {
            this.showSavedBanner.set(true);
            void this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { saved: null },
                queryParamsHandling: '',
                replaceUrl: true
            });
        }

        this.route.paramMap
            .pipe(
                switchMap((params) => {
                    const id = params.get('id');
                    if (!id) {
                        this.error.set('Geçersiz muayene.');
                        this.loading.set(false);
                        this.resetRelatedSummary();
                        return EMPTY;
                    }
                    this.lastId = id;
                    this.loading.set(true);
                    this.error.set(null);
                    this.resetRelatedSummary();
                    return this.examinationsService.getExaminationById(id);
                })
            )
            .subscribe({
                next: (x) => {
                    this.exam.set(x);
                    this.loading.set(false);
                    this.loadRelatedBlocks(x);
                },
                error: (e: Error) => {
                    this.error.set(e.message ?? 'Yükleme hatası');
                    this.loading.set(false);
                    this.resetRelatedSummary();
                }
            });
    }

    reload(): void {
        if (!this.lastId) {
            return;
        }
        this.loading.set(true);
        this.error.set(null);
        this.resetRelatedSummary();
        this.examinationsService.getExaminationById(this.lastId).subscribe({
            next: (x) => {
                this.exam.set(x);
                this.loading.set(false);
                this.loadRelatedBlocks(x);
            },
            error: (e: Error) => {
                this.error.set(e.message ?? 'Yükleme hatası');
                this.loading.set(false);
                this.resetRelatedSummary();
            }
        });
    }

    retryRelatedSummary(): void {
        if (!this.lastId) {
            return;
        }
        this.loadRelatedSummary(this.lastId);
    }

    private resetRelatedSummary(): void {
        this.relatedSummary.set(null);
        this.relatedSummaryLoading.set(false);
        this.relatedSummaryError.set(null);
    }

    private loadRelatedSummary(examinationId: string): void {
        this.relatedSummaryLoading.set(true);
        this.relatedSummaryError.set(null);
        this.examinationsService.getExaminationRelatedSummary(examinationId).subscribe({
            next: (s) => {
                this.relatedSummary.set(s);
                this.relatedSummaryLoading.set(false);
            },
            error: (e: Error) => {
                this.relatedSummaryError.set(e.message ?? 'İlgili kayıtlar yüklenemedi.');
                this.relatedSummaryLoading.set(false);
            }
        });
    }

    private loadRelatedBlocks(x: ExaminationDetailVm): void {
        this.loadRelatedSummary(x.id);

        if (!x.petId?.trim()) {
            this.sibItems.set([]);
            this.sibLoading.set(false);
            this.sibError.set(null);
            this.apptItems.set([]);
            this.apptLoading.set(false);
            this.apptError.set(null);
            return;
        }

        const petId = x.petId.trim();

        this.sibLoading.set(true);
        this.sibError.set(null);
        this.related.loadSiblingExaminationsForPet(petId, x.id).subscribe({
            next: (items) => {
                this.sibItems.set(items);
                this.sibLoading.set(false);
            },
            error: (e: Error) => {
                this.sibError.set(e.message ?? 'Muayene listesi yüklenemedi.');
                this.sibLoading.set(false);
            }
        });

        this.apptLoading.set(true);
        this.apptError.set(null);
        this.related.loadRecentAppointmentsForPetChronological(petId).subscribe({
            next: (items) => {
                this.apptItems.set(items);
                this.apptLoading.set(false);
            },
            error: (e: Error) => {
                this.apptError.set(e.message ?? 'Randevular yüklenemedi.');
                this.apptLoading.set(false);
            }
        });
    }
}
