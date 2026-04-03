import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import { appointmentTypeDisplayLabel } from '@/app/features/appointments/utils/appointment-type.utils';
import type { ExaminationDetailVm, ExaminationListItemVm } from '@/app/features/examinations/models/examination-vm.model';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import type { PaymentListItemVm } from '@/app/features/payments/models/payment-vm.model';
import type { PrescriptionListItemVm } from '@/app/features/prescriptions/models/prescription-vm.model';
import type { TreatmentListItemVm } from '@/app/features/treatments/models/treatment-vm.model';
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
                        @if (exam()!.clientId) {
                            <p class="mt-0 mb-2">
                                <a [routerLink]="['/panel/clients', exam()!.clientId]" class="text-primary font-medium no-underline">Müşteri detayı →</a>
                            </p>
                        }
                        @if (exam()!.petId) {
                            <p class="mt-0 mb-3">
                                <a [routerLink]="['/panel/pets', exam()!.petId]" class="text-primary font-medium no-underline">Hayvan detayı →</a>
                            </p>
                        }
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Müşteri</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ exam()!.clientName }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Hayvan</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ exam()!.petName }}</dd>
                        </dl>
                    </div>
                </div>

                <div class="col-span-12 lg:col-span-4">
                    <div class="card">
                        <div class="flex flex-wrap gap-2 items-center justify-between mb-4">
                            <h5 class="mt-0 mb-0">Bağlı tedaviler</h5>
                            <a routerLink="/panel/treatments" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (!exam()!.petId?.trim()) {
                            <app-empty-state message="Hayvan bilgisi yok; liste gösterilemiyor." />
                        } @else if (trLoading()) {
                            <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                        } @else if (trError()) {
                            <p class="text-muted-color m-0">{{ trError() }}</p>
                        } @else if (trItems().length === 0) {
                            <app-empty-state message="Bu muayeneye bağlı tedavi yok." />
                        } @else {
                            <ul class="list-none m-0 p-0">
                                @for (row of trItems(); track row.id) {
                                    <li class="mb-3 last:mb-0">
                                        <div class="flex flex-wrap gap-2 justify-between items-baseline">
                                            <span class="text-muted-color text-sm">{{ formatDt(row.treatmentDateUtc) }}</span>
                                            <a [routerLink]="['/panel/treatments', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                        </div>
                                        <div class="font-medium">{{ row.title }}</div>
                                    </li>
                                }
                            </ul>
                        }
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-4">
                    <div class="card">
                        <div class="flex flex-wrap gap-2 items-center justify-between mb-4">
                            <h5 class="mt-0 mb-0">Bağlı reçeteler</h5>
                            <a routerLink="/panel/prescriptions" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (!exam()!.petId?.trim()) {
                            <app-empty-state message="Hayvan bilgisi yok; liste gösterilemiyor." />
                        } @else if (rxLoading()) {
                            <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                        } @else if (rxError()) {
                            <p class="text-muted-color m-0">{{ rxError() }}</p>
                        } @else if (rxItems().length === 0) {
                            <app-empty-state message="Bu muayeneye bağlı reçete yok." />
                        } @else {
                            <ul class="list-none m-0 p-0">
                                @for (row of rxItems(); track row.id) {
                                    <li class="mb-3 last:mb-0">
                                        <div class="flex flex-wrap gap-2 justify-between items-baseline">
                                            <span class="text-muted-color text-sm">{{ formatDt(row.prescribedAtUtc) }}</span>
                                            <a [routerLink]="['/panel/prescriptions', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                        </div>
                                        <div class="font-medium">{{ row.title }}</div>
                                    </li>
                                }
                            </ul>
                        }
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-4">
                    <div class="card">
                        <div class="flex flex-wrap gap-2 items-center justify-between mb-4">
                            <h5 class="mt-0 mb-0">Bağlı ödemeler</h5>
                            <a routerLink="/panel/payments" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        <p class="text-xs text-muted-color mt-0 mb-3">
                            Liste yanıtında muayene kimliği yok; aynı hayvan/müşteri kapsamındaki son ödemeler gösterilir (tam FK eşlemesi değil).
                        </p>
                        @if (payLoading()) {
                            <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                        } @else if (payError()) {
                            <p class="text-muted-color m-0">{{ payError() }}</p>
                        } @else if (payItems().length === 0) {
                            <app-empty-state message="Özet için uygun ödeme bulunamadı." />
                        } @else {
                            <ul class="list-none m-0 p-0">
                                @for (row of payItems(); track row.id) {
                                    <li class="mb-3 last:mb-0">
                                        <div class="flex flex-wrap gap-2 justify-between items-baseline">
                                            <span class="font-medium">{{ money(row.amount, row.currency) }}</span>
                                            <a [routerLink]="['/panel/payments', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                        </div>
                                        <div class="text-sm text-muted-color">
                                            {{ formatDate(row.paidAtUtc) }} · {{ payMethodLabel(row.method) }}
                                        </div>
                                    </li>
                                }
                            </ul>
                        }
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <div class="flex flex-wrap gap-2 items-center justify-between mb-4">
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
                                    <li class="mb-3 last:mb-0">
                                        <div class="flex flex-wrap gap-2 justify-between items-baseline">
                                            <span class="text-muted-color text-sm">{{ formatDt(row.examinedAtUtc) }}</span>
                                            <a [routerLink]="['/panel/examinations', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                        </div>
                                        <div class="font-medium">{{ row.visitReason }}</div>
                                    </li>
                                }
                            </ul>
                        }
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <div class="flex flex-wrap gap-2 items-center justify-between mb-4">
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
                                    <li class="mb-3 last:mb-0">
                                        <div class="flex flex-wrap gap-2 justify-between items-baseline">
                                            <span class="text-muted-color text-sm">{{ formatDt(row.scheduledAtUtc) }}</span>
                                            <a [routerLink]="['/panel/appointments', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                        </div>
                                        <div class="font-medium">{{ typeDisplay(row.appointmentType, row.appointmentTypeName) }}</div>
                                    </li>
                                }
                            </ul>
                        }
                    </div>
                </div>

                <div class="col-span-12">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Ziyaret sebebi</h5>
                        @if (exam()!.visitReason === emptyMark) {
                            <app-empty-state message="Ziyaret sebebi girilmemiş." />
                        } @else {
                            <p class="m-0 whitespace-pre-wrap">{{ exam()!.visitReason }}</p>
                        }
                    </div>
                </div>
                <div class="col-span-12">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Bulgular</h5>
                        @if (exam()!.findings === emptyMark) {
                            <app-empty-state message="Bulgu kaydı yok." />
                        } @else {
                            <p class="m-0 whitespace-pre-wrap">{{ exam()!.findings }}</p>
                        }
                    </div>
                </div>
                <div class="col-span-12">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Değerlendirme</h5>
                        @if (exam()!.assessment === emptyMark) {
                            <app-empty-state message="Değerlendirme girilmemiş." />
                        } @else {
                            <p class="m-0 whitespace-pre-wrap">{{ exam()!.assessment }}</p>
                        }
                    </div>
                </div>
                <div class="col-span-12">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Notlar</h5>
                        @if (exam()!.notes === emptyMark) {
                            <app-empty-state message="Not yok." />
                        } @else {
                            <p class="m-0 whitespace-pre-wrap">{{ exam()!.notes }}</p>
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

    readonly payLoading = signal(false);
    readonly payError = signal<string | null>(null);
    readonly payItems = signal<PaymentListItemVm[]>([]);

    readonly trLoading = signal(false);
    readonly trError = signal<string | null>(null);
    readonly trItems = signal<TreatmentListItemVm[]>([]);

    readonly rxLoading = signal(false);
    readonly rxError = signal<string | null>(null);
    readonly rxItems = signal<PrescriptionListItemVm[]>([]);

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
    readonly money = (amount: number | null, currency: string) => formatMoney(amount, currency || 'TRY');
    readonly payMethodLabel = paymentMethodLabel;

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
                        return EMPTY;
                    }
                    this.lastId = id;
                    this.loading.set(true);
                    this.error.set(null);
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
                }
            });
    }

    reload(): void {
        if (!this.lastId) {
            return;
        }
        this.loading.set(true);
        this.error.set(null);
        this.examinationsService.getExaminationById(this.lastId).subscribe({
            next: (x) => {
                this.exam.set(x);
                this.loading.set(false);
                this.loadRelatedBlocks(x);
            },
            error: (e: Error) => {
                this.error.set(e.message ?? 'Yükleme hatası');
                this.loading.set(false);
            }
        });
    }

    private loadRelatedBlocks(x: ExaminationDetailVm): void {
        this.payLoading.set(true);
        this.payError.set(null);
        this.related.loadRelatedPaymentsForExaminationContext(x.petId, x.clientId).subscribe({
            next: (items) => {
                this.payItems.set(items);
                this.payLoading.set(false);
            },
            error: (e: Error) => {
                this.payError.set(e.message ?? 'Ödemeler yüklenemedi.');
                this.payLoading.set(false);
            }
        });

        const petOk = !!x.petId?.trim();
        if (petOk) {
            const petId = x.petId!.trim();
            this.trLoading.set(true);
            this.trError.set(null);
            this.related.loadTreatmentsLinkedToExamination(petId, x.id).subscribe({
                next: (items) => {
                    this.trItems.set(items);
                    this.trLoading.set(false);
                },
                error: (e: Error) => {
                    this.trError.set(e.message ?? 'Tedaviler yüklenemedi.');
                    this.trLoading.set(false);
                }
            });
            this.rxLoading.set(true);
            this.rxError.set(null);
            this.related.loadPrescriptionsLinkedToExamination(petId, x.id).subscribe({
                next: (items) => {
                    this.rxItems.set(items);
                    this.rxLoading.set(false);
                },
                error: (e: Error) => {
                    this.rxError.set(e.message ?? 'Reçeteler yüklenemedi.');
                    this.rxLoading.set(false);
                }
            });
        } else {
            this.trItems.set([]);
            this.trLoading.set(false);
            this.trError.set(null);
            this.rxItems.set([]);
            this.rxLoading.set(false);
            this.rxError.set(null);
        }

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
