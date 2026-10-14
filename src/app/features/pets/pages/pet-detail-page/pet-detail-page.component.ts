import { LabResultStatusBadgesComponent } from '@/app/features/lab-results/components/lab-result-status-badges.component';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { appointmentTypeDisplayLabel } from '@/app/features/appointments/utils/appointment-type.utils';
import { appointmentStatusLabel } from '@/app/features/appointments/utils/appointment-status.utils';
import { paymentMethodLabel } from '@/app/features/payments/utils/payment-method.utils';
import type {
    PetDetailVm,
    PetHistoryAppointmentItemVm,
    PetHistoryHospitalizationItemVm,
    PetHistorySummaryVm
} from '@/app/features/pets/models/pet-vm.model';
import { PetSummaryCardComponent } from '@/app/features/pets/components/pet-summary-card.component';
import type { PetHistoryBlockKey } from '@/app/features/pets/models/pet-vm.model';
import type { PetSummaryVm } from '@/app/features/pets/models/pet-summary-vm.model';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { buildPetGeneralFields } from '@/app/features/pets/utils/pet-general-fields.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { PetAlertBadgesComponent } from '@/app/shared/pet-alerts/pet-alert-badges.component';
import { PatientActionBarComponent } from '@/app/shared/panel/patient-action-bar/patient-action-bar.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { formatUtcIsoAsLocalDateDisplay, formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { EMPTY, switchMap } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { PETS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { sliceDetailRelatedList } from '@/app/shared/panel/detail-related-list.utils';

const EM = '—';

@Component({
    selector: 'app-pet-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        LabResultStatusBadgesComponent,
        RouterLink,
        ButtonModule,
        AppPageHeaderComponent,
        PetAlertBadgesComponent,
        PatientActionBarComponent,
        PetSummaryCardComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent
    ],
    template: `
        <a routerLink="/panel/pets" class="text-primary font-medium no-underline inline-block mb-4">← Hayvan listesine dön</a>

        @if (showSavedBanner()) {
            <p class="mb-4 m-0 text-sm font-medium">Hayvan kaydedildi.</p>
        }

        @if (loading()) {
            <app-loading-state message="Hayvan yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (pet()) {
            <app-page-header
                [title]="pet()!.name"
                [description]="'Doğum: ' + formatDateOnly(pet()!.birthDate) + ' · ' + pet()!.speciesName"
            >
                @if (canUpdatePet && !ro.mutationBlocked()) {
                    <a
                        actions
                        [routerLink]="['/panel/pets', pet()!.id, 'edit']"
                        pButton
                        type="button"
                        label="Düzenle"
                        icon="pi pi-pencil"
                        class="p-button-secondary"
                    ></a>
                } @else if (canUpdatePet && ro.mutationBlocked()) {
                    <button
                        actions
                        pButton
                        type="button"
                        label="Düzenle (salt okunur)"
                        icon="pi pi-lock"
                        [disabled]="true"
                        class="p-button-secondary"
                    ></button>
                }
            </app-page-header>
            @if (pet()!.ownerId) {
                <app-patient-action-bar [clientId]="pet()!.ownerId!" [petId]="pet()!.id" [petLabel]="pet()!.name + ' — ' + pet()!.speciesName" [clientName]="pet()!.clientName" />
            }
            @if (pet()!.petAlerts.flags.length > 0) {
                <div class="card mb-4" role="region" aria-label="Hasta uyarıları">
                    <app-pet-alert-badges [alerts]="pet()!.petAlerts" />
                    @if (pet()!.petAlerts.note; as alertNote) {
                        <p class="m-0 mt-2">{{ alertNote }}</p>
                    }
                </div>
            }

            <app-pet-summary-card
                [petId]="pet()!.id"
                [summary]="summary()"
                [loading]="summaryLoading()"
                [error]="summaryError()"
                (retry)="retrySummary()"
            />

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Genel bilgiler</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            @for (field of generalFields().filled; track field.label) {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">{{ field.label }}</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">{{ field.value }}</dd>
                            }
                            @if (showEmptyFields()) {
                                @for (field of generalFields().empty; track field.label) {
                                    <dt class="col-span-12 sm:col-span-4 text-muted-color">{{ field.label }}</dt>
                                    <dd class="col-span-12 sm:col-span-8 m-0 text-muted-color">{{ field.value }}</dd>
                                }
                            }
                        </dl>
                        @if (generalFields().empty.length > 0) {
                            <button
                                type="button"
                                class="mt-3 p-0 border-0 bg-transparent text-primary text-sm font-medium cursor-pointer"
                                data-testid="toggle-empty-fields"
                                (click)="showEmptyFields.set(!showEmptyFields())"
                            >
                                {{ showEmptyFields() ? 'Boş alanları gizle' : 'Boş alanları göster (' + generalFields().empty.length + ')' }}
                            </button>
                        }
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Sahip bilgileri</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Ad</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                @if (pet()!.ownerId) {
                                    <a [routerLink]="['/panel/clients', pet()!.ownerId]" class="text-primary font-medium no-underline">{{ pet()!.clientName }}</a>
                                } @else {
                                    {{ pet()!.clientName }}
                                }
                            </dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Telefon</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatClientPhoneForDisplay(pet()!.clientPhone) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">E-posta</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ pet()!.clientEmail }}</dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Notlar</h5>
                        <p class="m-0 whitespace-pre-wrap">{{ pet()!.notes }}</p>
                    </div>
                </div>

                <div class="col-span-12">
                    <h4 class="mt-0 mb-4 text-xl font-semibold">Hasta geçmişi</h4>
                </div>

                @if (historyLoading()) {
                    <div class="col-span-12">
                        <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                    </div>
                } @else if (historyError()) {
                    <div class="col-span-12">
                        <div class="card">
                            <app-error-state [detail]="historyError()!" (retry)="retryHistory()" />
                        </div>
                    </div>
                } @else if (history()) {
                    <div class="col-span-12 lg:col-span-6">
                        <div class="card">
                            <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center mb-4">
                                <h5 class="mt-0 mb-0">Son randevular</h5>
                                <a routerLink="/panel/appointments" [queryParams]="{ petId: pet()!.id }" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                            </div>
                            @if (isBlockOmitted('Appointments')) {
                                <p class="m-0 text-muted-color" data-testid="block-forbidden"><i class="pi pi-lock mr-1" aria-hidden="true"></i>Bu bilgiyi görme yetkiniz yok</p>
                            } @else if (recentAppointmentsView().total === 0) {
                                <app-empty-state [message]="copy.listEmptyMessage" />
                            } @else {
                                <ul class="list-none m-0 p-0">
                                    @for (row of recentAppointmentsView().displayed; track row.id) {
                                        <li
                                            class="mb-3 last:mb-0 min-w-0 max-lg:rounded-border max-lg:border max-lg:border-surface-200 max-lg:dark:border-surface-700 max-lg:p-3 max-lg:shadow-sm"
                                        >
                                            <div class="text-muted-color text-sm mb-1.5 lg:hidden">{{ formatDt(row.scheduledAtUtc) }}</div>
                                            <div class="hidden lg:flex lg:flex-wrap lg:gap-2 lg:justify-between lg:items-baseline">
                                                <span class="text-muted-color text-sm min-w-0">{{ formatDt(row.scheduledAtUtc) }}</span>
                                                <a [routerLink]="['/panel/appointments', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                            </div>
                                            <div class="font-medium min-w-0 break-words">{{ appointmentSubtitle(row) }}</div>
                                            @if (row.clinicName) {
                                                <div class="text-muted-color text-sm min-w-0 break-words">{{ row.clinicName }}</div>
                                            }
                                            @if (clipNotes(row.notes)) {
                                                <div class="text-muted-color text-sm mt-1 min-w-0 break-words">{{ clipNotes(row.notes) }}</div>
                                            }
                                            <div class="flex justify-end mt-2 pt-2 border-t border-surface-200 dark:border-surface-700 lg:hidden">
                                                <a [routerLink]="['/panel/appointments', row.id]" class="text-primary font-medium no-underline text-sm py-1">Detay →</a>
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
                                <h5 class="mt-0 mb-0">Son muayeneler</h5>
                                <a routerLink="/panel/examinations" [queryParams]="{ petId: pet()!.id }" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                            </div>
                            @if (isBlockOmitted('Examinations')) {
                                <p class="m-0 text-muted-color" data-testid="block-forbidden"><i class="pi pi-lock mr-1" aria-hidden="true"></i>Bu bilgiyi görme yetkiniz yok</p>
                            } @else if (recentExaminationsView().total === 0) {
                                <app-empty-state [message]="copy.listEmptyMessage" />
                            } @else {
                                <ul class="list-none m-0 p-0">
                                    @for (row of recentExaminationsView().displayed; track row.id) {
                                        <li
                                            class="mb-3 last:mb-0 min-w-0 max-lg:rounded-border max-lg:border max-lg:border-surface-200 max-lg:dark:border-surface-700 max-lg:p-3 max-lg:shadow-sm"
                                        >
                                            <div class="text-muted-color text-sm mb-1.5 lg:hidden">{{ formatDt(row.examinedAtUtc) }}</div>
                                            <div class="hidden lg:flex lg:flex-wrap lg:gap-2 lg:justify-between lg:items-baseline">
                                                <span class="text-muted-color text-sm min-w-0">{{ formatDt(row.examinedAtUtc) }}</span>
                                                <a [routerLink]="['/panel/examinations', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                            </div>
                                            <div class="font-medium min-w-0 break-words">{{ row.visitReason }}</div>
                                            @if (row.clinicName) {
                                                <div class="text-muted-color text-sm min-w-0 break-words">{{ row.clinicName }}</div>
                                            }
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
                                <h5 class="mt-0 mb-0">Son tedaviler</h5>
                                <a routerLink="/panel/treatments" [queryParams]="{ petId: pet()!.id }" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                            </div>
                            @if (isBlockOmitted('Treatments')) {
                                <p class="m-0 text-muted-color" data-testid="block-forbidden"><i class="pi pi-lock mr-1" aria-hidden="true"></i>Bu bilgiyi görme yetkiniz yok</p>
                            } @else if (recentTreatmentsView().total === 0) {
                                <app-empty-state [message]="copy.listEmptyMessage" />
                            } @else {
                                <ul class="list-none m-0 p-0">
                                    @for (row of recentTreatmentsView().displayed; track row.id) {
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
                                <h5 class="mt-0 mb-0">Son reçeteler</h5>
                                <a routerLink="/panel/prescriptions" [queryParams]="{ petId: pet()!.id }" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                            </div>
                            @if (isBlockOmitted('Prescriptions')) {
                                <p class="m-0 text-muted-color" data-testid="block-forbidden"><i class="pi pi-lock mr-1" aria-hidden="true"></i>Bu bilgiyi görme yetkiniz yok</p>
                            } @else if (recentPrescriptionsView().total === 0) {
                                <app-empty-state [message]="copy.listEmptyMessage" />
                            } @else {
                                <ul class="list-none m-0 p-0">
                                    @for (row of recentPrescriptionsView().displayed; track row.id) {
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
                                <h5 class="mt-0 mb-0">Son lab sonuçları</h5>
                                <a routerLink="/panel/lab-results" [queryParams]="{ petId: pet()!.id }" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                            </div>
                            @if (isBlockOmitted('LabResults')) {
                                <p class="m-0 text-muted-color" data-testid="block-forbidden"><i class="pi pi-lock mr-1" aria-hidden="true"></i>Bu bilgiyi görme yetkiniz yok</p>
                            } @else if (recentLabResultsView().total === 0) {
                                <app-empty-state [message]="copy.listEmptyMessage" />
                            } @else {
                                <ul class="list-none m-0 p-0">
                                    @for (row of recentLabResultsView().displayed; track row.id) {
                                        <li
                                            class="mb-3 last:mb-0 min-w-0 max-lg:rounded-border max-lg:border max-lg:border-surface-200 max-lg:dark:border-surface-700 max-lg:p-3 max-lg:shadow-sm"
                                        >
                                            <div class="text-muted-color text-sm mb-1.5 lg:hidden">{{ formatDt(row.resultDateUtc ?? row.requestedAtUtc) }}</div>
                                            <div class="hidden lg:flex lg:flex-wrap lg:gap-2 lg:justify-between lg:items-baseline">
                                                <span class="text-muted-color text-sm min-w-0">{{ formatDt(row.resultDateUtc ?? row.requestedAtUtc) }}</span>
                                                <a [routerLink]="['/panel/lab-results', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                            </div>
                                            <div class="font-medium min-w-0 break-words">{{ row.testName }}</div>
                                            <app-lab-result-status-badges [status]="row.status" [awaitingInterpretation]="row.awaitingInterpretation" />
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
                                <h5 class="mt-0 mb-0">Son yatışlar</h5>
                                <a routerLink="/panel/hospitalizations" [queryParams]="{ petId: pet()!.id }" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                            </div>
                            @if (isBlockOmitted('Hospitalizations')) {
                                <p class="m-0 text-muted-color" data-testid="block-forbidden"><i class="pi pi-lock mr-1" aria-hidden="true"></i>Bu bilgiyi görme yetkiniz yok</p>
                            } @else if (recentHospitalizationsView().total === 0) {
                                <app-empty-state [message]="copy.listEmptyMessage" />
                            } @else {
                                <ul class="list-none m-0 p-0">
                                    @for (row of recentHospitalizationsView().displayed; track row.id) {
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
                                <h5 class="mt-0 mb-0">Son ödemeler</h5>
                                <a routerLink="/panel/payments" [queryParams]="{ petId: pet()!.id }" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                            </div>
                            @if (isBlockOmitted('Payments')) {
                                <p class="m-0 text-muted-color" data-testid="block-forbidden"><i class="pi pi-lock mr-1" aria-hidden="true"></i>Bu bilgiyi görme yetkiniz yok</p>
                            } @else if (recentPaymentsView().total === 0) {
                                <app-empty-state [message]="copy.listEmptyMessage" />
                            } @else {
                                <ul class="list-none m-0 p-0">
                                    @for (row of recentPaymentsView().displayed; track row.id) {
                                        <li
                                            class="mb-3 last:mb-0 min-w-0 max-lg:rounded-border max-lg:border max-lg:border-surface-200 max-lg:dark:border-surface-700 max-lg:p-3 max-lg:shadow-sm"
                                        >
                                            <div class="lg:hidden space-y-2 min-w-0">
                                                <div class="text-muted-color text-sm">{{ formatDt(row.paidAtUtc) }}</div>
                                                <div class="font-semibold text-base tabular-nums text-surface-900 dark:text-surface-0 min-w-0 break-words">
                                                    {{ formatMoney(row.amount, row.currency ?? 'TRY') }}
                                                </div>
                                                <div class="text-sm text-muted-color min-w-0 break-words">{{ paymentMethodLabel(row.method) }}</div>
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
                                                <div class="font-medium min-w-0 break-words">
                                                    {{ formatMoney(row.amount, row.currency ?? 'TRY') }} · {{ paymentMethodLabel(row.method) }}
                                                </div>
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
            </div>
        }
    `
})
export class PetDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly petsService = inject(PetsService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly copy = PANEL_COPY;
    readonly formatClientPhoneForDisplay = formatClientPhoneForDisplay;
    readonly formatMoney = formatMoney;
    readonly paymentMethodLabel = paymentMethodLabel;

    /** Yeni oluşturma sonrası kısa onay (query `saved=1`). */
    readonly showSavedBanner = signal(false);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly pet = signal<PetDetailVm | null>(null);
    readonly showEmptyFields = signal(false);
    readonly generalFields = computed(() => {
        const p = this.pet();
        return p ? buildPetGeneralFields(p) : { filled: [], empty: [] };
    });

    readonly historyLoading = signal(false);
    readonly historyError = signal<string | null>(null);
    readonly history = signal<PetHistorySummaryVm | null>(null);
    readonly summaryLoading = signal(false);
    readonly summaryError = signal<string | null>(null);
    readonly summary = signal<PetSummaryVm | null>(null);

    readonly recentAppointmentsView = computed(() => sliceDetailRelatedList(this.history()?.recentAppointments));
    readonly recentExaminationsView = computed(() => sliceDetailRelatedList(this.history()?.recentExaminations));
    readonly recentTreatmentsView = computed(() => sliceDetailRelatedList(this.history()?.recentTreatments));
    readonly recentPrescriptionsView = computed(() => sliceDetailRelatedList(this.history()?.recentPrescriptions));
    readonly recentLabResultsView = computed(() => sliceDetailRelatedList(this.history()?.recentLabResults));
    readonly recentHospitalizationsView = computed(() => sliceDetailRelatedList(this.history()?.recentHospitalizations));
    readonly recentPaymentsView = computed(() => sliceDetailRelatedList(this.history()?.recentPayments));

    private lastId: string | null = null;

    readonly formatDateOnly = (v: string | null) => formatUtcIsoAsLocalDateDisplay(v);
    readonly formatDt = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly canUpdatePet = this.auth.hasOperationClaim(PETS_UPDATE_CLAIM);

    appointmentSubtitle(row: PetHistoryAppointmentItemVm): string {
        const t = appointmentTypeDisplayLabel(row.appointmentType, row.appointmentTypeName);
        const s = appointmentStatusLabel(row.status);
        const parts: string[] = [];
        if (t !== EM) {
            parts.push(t);
        }
        if (s !== EM) {
            parts.push(s);
        }
        return parts.length ? parts.join(' · ') : EM;
    }

    clipNotes(notes: string | null | undefined, max = 120): string {
        if (!notes?.trim()) {
            return '';
        }
        const t = notes.trim();
        return t.length <= max ? t : `${t.slice(0, max)}…`;
    }

    hospitalizationStatusLine(row: PetHistoryHospitalizationItemVm): string {
        if (row.dischargedAtUtc) {
            return `Çıkış: ${this.formatDt(row.dischargedAtUtc)}`;
        }
        if (row.isActive) {
            return 'Aktif yatış';
        }
        return 'Taburcu';
    }

    /** `omittedBlocks`: yetki yok nedeniyle boş; "kayıt yok" ile karıştırılmaz. */
    isBlockOmitted(key: PetHistoryBlockKey): boolean {
        return this.history()?.omittedBlocks.includes(key) ?? false;
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
                        this.error.set('Geçersiz pet.');
                        this.loading.set(false);
                        this.resetHistory();
                        return EMPTY;
                    }
                    this.lastId = id;
                    this.loading.set(true);
                    this.error.set(null);
                    this.resetHistory();
                    return this.petsService.getPetById(id);
                })
            )
            .subscribe({
                next: (p) => {
                    this.pet.set(p);
                    this.loading.set(false);
                    this.loadHistory(p.id);
                    this.loadSummary(p.id);
                },
                error: (e: Error) => {
                    this.error.set(e.message ?? 'Yükleme hatası');
                    this.loading.set(false);
                    this.resetHistory();
                }
            });
    }

    reload(): void {
        if (!this.lastId) {
            return;
        }
        this.loading.set(true);
        this.error.set(null);
        this.resetHistory();
        this.petsService.getPetById(this.lastId).subscribe({
            next: (p) => {
                this.pet.set(p);
                this.loading.set(false);
                this.loadHistory(p.id);
                this.loadSummary(p.id);
            },
            error: (e: Error) => {
                this.error.set(e.message ?? 'Yükleme hatası');
                this.loading.set(false);
                this.resetHistory();
            }
        });
    }

    retrySummary(): void {
        if (!this.lastId) {
            return;
        }
        this.loadSummary(this.lastId);
    }

    retryHistory(): void {
        if (!this.lastId) {
            return;
        }
        this.loadHistory(this.lastId);
    }

    private resetSummary(): void {
        this.summary.set(null);
        this.summaryLoading.set(false);
        this.summaryError.set(null);
    }

    private resetHistory(): void {
        this.resetSummary();
        this.history.set(null);
        this.historyLoading.set(false);
        this.historyError.set(null);
    }

    private loadSummary(petId: string): void {
        this.summaryLoading.set(true);
        this.summaryError.set(null);
        this.petsService.getPetSummary(petId).subscribe({
            next: (s) => {
                this.summary.set(s);
                this.summaryLoading.set(false);
            },
            error: (e: Error) => {
                this.summaryError.set(e.message ?? 'Hasta özeti yüklenemedi.');
                this.summaryLoading.set(false);
            }
        });
    }

    private loadHistory(petId: string): void {
        this.historyLoading.set(true);
        this.historyError.set(null);
        this.petsService.getPetHistorySummary(petId).subscribe({
            next: (h) => {
                this.history.set(h);
                this.historyLoading.set(false);
            },
            error: (e: Error) => {
                this.historyError.set(e.message ?? 'Hasta geçmişi yüklenemedi.');
                this.historyLoading.set(false);
            }
        });
    }
}
