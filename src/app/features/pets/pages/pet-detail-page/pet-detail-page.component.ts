import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
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
import { PetsService } from '@/app/features/pets/services/pets.service';
import { petGenderLabel } from '@/app/features/pets/utils/pet-status.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { formatDateDisplay, formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';
import { EMPTY, switchMap } from 'rxjs';

const EM = '—';

@Component({
    selector: 'app-pet-detail-page',
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
                subtitle="Hayvan"
                [description]="'Doğum: ' + formatDateOnly(pet()!.birthDate) + ' · ' + pet()!.speciesName"
            >
                <a
                    actions
                    [routerLink]="['/panel/pets', pet()!.id, 'edit']"
                    pButton
                    type="button"
                    label="Düzenle"
                    icon="pi pi-pencil"
                    class="p-button-secondary"
                ></a>
            </app-page-header>

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Genel bilgiler</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Tür</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ pet()!.speciesName }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Cins</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ pet()!.breed }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Cinsiyet</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ genderLabel(pet()!.gender) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Renk</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ pet()!.colorName }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Ağırlık</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ pet()!.weight }}</dd>
                        </dl>
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
                                <a routerLink="/panel/appointments" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                            </div>
                            @if (history()!.recentAppointments.length === 0) {
                                <app-empty-state [message]="copy.listEmptyMessage" />
                            } @else {
                                <ul class="list-none m-0 p-0">
                                    @for (row of history()!.recentAppointments; track row.id) {
                                        <li
                                            class="mb-3 last:mb-0 max-lg:rounded-border max-lg:border max-lg:border-surface-200 max-lg:dark:border-surface-700 max-lg:p-3 max-lg:shadow-sm"
                                        >
                                            <div class="text-muted-color text-sm mb-1.5 lg:hidden">{{ formatDt(row.scheduledAtUtc) }}</div>
                                            <div class="hidden lg:flex lg:flex-wrap lg:gap-2 lg:justify-between lg:items-baseline">
                                                <span class="text-muted-color text-sm">{{ formatDt(row.scheduledAtUtc) }}</span>
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
                                                <a [routerLink]="['/panel/appointments', row.id]" class="text-primary font-medium no-underline text-sm">Detay →</a>
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
                                <a routerLink="/panel/examinations" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                            </div>
                            @if (history()!.recentExaminations.length === 0) {
                                <app-empty-state [message]="copy.listEmptyMessage" />
                            } @else {
                                <ul class="list-none m-0 p-0">
                                    @for (row of history()!.recentExaminations; track row.id) {
                                        <li
                                            class="mb-3 last:mb-0 max-lg:rounded-border max-lg:border max-lg:border-surface-200 max-lg:dark:border-surface-700 max-lg:p-3 max-lg:shadow-sm"
                                        >
                                            <div class="text-muted-color text-sm mb-1.5 lg:hidden">{{ formatDt(row.examinedAtUtc) }}</div>
                                            <div class="hidden lg:flex lg:flex-wrap lg:gap-2 lg:justify-between lg:items-baseline">
                                                <span class="text-muted-color text-sm">{{ formatDt(row.examinedAtUtc) }}</span>
                                                <a [routerLink]="['/panel/examinations', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                            </div>
                                            <div class="font-medium min-w-0 break-words">{{ row.visitReason }}</div>
                                            @if (row.clinicName) {
                                                <div class="text-muted-color text-sm min-w-0 break-words">{{ row.clinicName }}</div>
                                            }
                                            <div class="flex justify-end mt-2 pt-2 border-t border-surface-200 dark:border-surface-700 lg:hidden">
                                                <a [routerLink]="['/panel/examinations', row.id]" class="text-primary font-medium no-underline text-sm">Detay →</a>
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
                                <a routerLink="/panel/treatments" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                            </div>
                            @if (history()!.recentTreatments.length === 0) {
                                <app-empty-state [message]="copy.listEmptyMessage" />
                            } @else {
                                <ul class="list-none m-0 p-0">
                                    @for (row of history()!.recentTreatments; track row.id) {
                                        <li
                                            class="mb-3 last:mb-0 max-lg:rounded-border max-lg:border max-lg:border-surface-200 max-lg:dark:border-surface-700 max-lg:p-3 max-lg:shadow-sm"
                                        >
                                            <div class="text-muted-color text-sm mb-1.5 lg:hidden">{{ formatDt(row.treatmentDateUtc) }}</div>
                                            <div class="hidden lg:flex lg:flex-wrap lg:gap-2 lg:justify-between lg:items-baseline">
                                                <span class="text-muted-color text-sm">{{ formatDt(row.treatmentDateUtc) }}</span>
                                                <a [routerLink]="['/panel/treatments', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                            </div>
                                            <div class="font-medium min-w-0 break-words">{{ row.title }}</div>
                                            @if (row.clinicName) {
                                                <div class="text-muted-color text-sm min-w-0 break-words">{{ row.clinicName }}</div>
                                            }
                                            <div class="flex justify-end mt-2 pt-2 border-t border-surface-200 dark:border-surface-700 lg:hidden">
                                                <a [routerLink]="['/panel/treatments', row.id]" class="text-primary font-medium no-underline text-sm">Detay →</a>
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
                                <a routerLink="/panel/prescriptions" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                            </div>
                            @if (history()!.recentPrescriptions.length === 0) {
                                <app-empty-state [message]="copy.listEmptyMessage" />
                            } @else {
                                <ul class="list-none m-0 p-0">
                                    @for (row of history()!.recentPrescriptions; track row.id) {
                                        <li
                                            class="mb-3 last:mb-0 max-lg:rounded-border max-lg:border max-lg:border-surface-200 max-lg:dark:border-surface-700 max-lg:p-3 max-lg:shadow-sm"
                                        >
                                            <div class="text-muted-color text-sm mb-1.5 lg:hidden">{{ formatDt(row.prescribedAtUtc) }}</div>
                                            <div class="hidden lg:flex lg:flex-wrap lg:gap-2 lg:justify-between lg:items-baseline">
                                                <span class="text-muted-color text-sm">{{ formatDt(row.prescribedAtUtc) }}</span>
                                                <a [routerLink]="['/panel/prescriptions', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                            </div>
                                            <div class="font-medium min-w-0 break-words">{{ row.title }}</div>
                                            @if (row.clinicName) {
                                                <div class="text-muted-color text-sm min-w-0 break-words">{{ row.clinicName }}</div>
                                            }
                                            <div class="flex justify-end mt-2 pt-2 border-t border-surface-200 dark:border-surface-700 lg:hidden">
                                                <a [routerLink]="['/panel/prescriptions', row.id]" class="text-primary font-medium no-underline text-sm">Detay →</a>
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
                                <a routerLink="/panel/lab-results" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                            </div>
                            @if (history()!.recentLabResults.length === 0) {
                                <app-empty-state [message]="copy.listEmptyMessage" />
                            } @else {
                                <ul class="list-none m-0 p-0">
                                    @for (row of history()!.recentLabResults; track row.id) {
                                        <li
                                            class="mb-3 last:mb-0 max-lg:rounded-border max-lg:border max-lg:border-surface-200 max-lg:dark:border-surface-700 max-lg:p-3 max-lg:shadow-sm"
                                        >
                                            <div class="text-muted-color text-sm mb-1.5 lg:hidden">{{ formatDt(row.resultDateUtc) }}</div>
                                            <div class="hidden lg:flex lg:flex-wrap lg:gap-2 lg:justify-between lg:items-baseline">
                                                <span class="text-muted-color text-sm">{{ formatDt(row.resultDateUtc) }}</span>
                                                <a [routerLink]="['/panel/lab-results', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                            </div>
                                            <div class="font-medium min-w-0 break-words">{{ row.testName }}</div>
                                            @if (row.clinicName) {
                                                <div class="text-muted-color text-sm min-w-0 break-words">{{ row.clinicName }}</div>
                                            }
                                            <div class="flex justify-end mt-2 pt-2 border-t border-surface-200 dark:border-surface-700 lg:hidden">
                                                <a [routerLink]="['/panel/lab-results', row.id]" class="text-primary font-medium no-underline text-sm">Detay →</a>
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
                                <a routerLink="/panel/hospitalizations" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                            </div>
                            @if (history()!.recentHospitalizations.length === 0) {
                                <app-empty-state [message]="copy.listEmptyMessage" />
                            } @else {
                                <ul class="list-none m-0 p-0">
                                    @for (row of history()!.recentHospitalizations; track row.id) {
                                        <li
                                            class="mb-3 last:mb-0 max-lg:rounded-border max-lg:border max-lg:border-surface-200 max-lg:dark:border-surface-700 max-lg:p-3 max-lg:shadow-sm"
                                        >
                                            <div class="text-muted-color text-sm mb-1.5 lg:hidden">{{ formatDt(row.admittedAtUtc) }}</div>
                                            <div class="hidden lg:flex lg:flex-wrap lg:gap-2 lg:justify-between lg:items-baseline">
                                                <span class="text-muted-color text-sm">{{ formatDt(row.admittedAtUtc) }}</span>
                                                <a [routerLink]="['/panel/hospitalizations', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                            </div>
                                            <div class="font-medium min-w-0 break-words">{{ row.reason }}</div>
                                            <div class="text-muted-color text-sm min-w-0 break-words">{{ hospitalizationStatusLine(row) }}</div>
                                            @if (row.clinicName) {
                                                <div class="text-muted-color text-sm min-w-0 break-words">{{ row.clinicName }}</div>
                                            }
                                            <div class="flex justify-end mt-2 pt-2 border-t border-surface-200 dark:border-surface-700 lg:hidden">
                                                <a [routerLink]="['/panel/hospitalizations', row.id]" class="text-primary font-medium no-underline text-sm">Detay →</a>
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
                                <a routerLink="/panel/payments" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                            </div>
                            @if (history()!.recentPayments.length === 0) {
                                <app-empty-state [message]="copy.listEmptyMessage" />
                            } @else {
                                <ul class="list-none m-0 p-0">
                                    @for (row of history()!.recentPayments; track row.id) {
                                        <li
                                            class="mb-3 last:mb-0 max-lg:rounded-border max-lg:border max-lg:border-surface-200 max-lg:dark:border-surface-700 max-lg:p-3 max-lg:shadow-sm"
                                        >
                                            <div class="text-muted-color text-sm mb-1.5 lg:hidden">{{ formatDt(row.paidAtUtc) }}</div>
                                            <div class="hidden lg:flex lg:flex-wrap lg:gap-2 lg:justify-between lg:items-baseline">
                                                <span class="text-muted-color text-sm">{{ formatDt(row.paidAtUtc) }}</span>
                                                <a [routerLink]="['/panel/payments', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                            </div>
                                            <div class="font-medium min-w-0 break-words">
                                                {{ formatMoney(row.amount, row.currency ?? 'TRY') }} · {{ paymentMethodLabel(row.method) }}
                                            </div>
                                            @if (row.clinicName) {
                                                <div class="text-muted-color text-sm min-w-0 break-words">{{ row.clinicName }}</div>
                                            }
                                            <div class="flex justify-end mt-2 pt-2 border-t border-surface-200 dark:border-surface-700 lg:hidden">
                                                <a [routerLink]="['/panel/payments', row.id]" class="text-primary font-medium no-underline text-sm">Detay →</a>
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

    readonly copy = PANEL_COPY;
    readonly formatClientPhoneForDisplay = formatClientPhoneForDisplay;
    readonly formatMoney = formatMoney;
    readonly paymentMethodLabel = paymentMethodLabel;

    /** Yeni oluşturma sonrası kısa onay (query `saved=1`). */
    readonly showSavedBanner = signal(false);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly pet = signal<PetDetailVm | null>(null);

    readonly historyLoading = signal(false);
    readonly historyError = signal<string | null>(null);
    readonly history = signal<PetHistorySummaryVm | null>(null);

    private lastId: string | null = null;

    readonly formatDateOnly = (v: string | null) => formatDateDisplay(v);
    readonly formatDt = (v: string | null) => formatDateTimeDisplay(v);
    readonly genderLabel = petGenderLabel;

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
            },
            error: (e: Error) => {
                this.error.set(e.message ?? 'Yükleme hatası');
                this.loading.set(false);
                this.resetHistory();
            }
        });
    }

    retryHistory(): void {
        if (!this.lastId) {
            return;
        }
        this.loadHistory(this.lastId);
    }

    private resetHistory(): void {
        this.history.set(null);
        this.historyLoading.set(false);
        this.historyError.set(null);
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
