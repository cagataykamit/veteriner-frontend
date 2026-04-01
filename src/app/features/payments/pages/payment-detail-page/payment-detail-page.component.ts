import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import { appointmentTypeDisplayLabel } from '@/app/features/appointments/utils/appointment-type.utils';
import type { ExaminationListItemVm } from '@/app/features/examinations/models/examination-vm.model';
import type { PaymentDetailVm } from '@/app/features/payments/models/payment-vm.model';
import { PaymentsService } from '@/app/features/payments/services/payments.service';
import { paymentMethodLabel } from '@/app/features/payments/utils/payment-method.utils';
import { DetailRelatedSummariesService } from '@/app/shared/panel/detail-related-summaries.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { EMPTY, switchMap } from 'rxjs';

@Component({
    selector: 'app-payment-detail-page',
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
        <a routerLink="/panel/payments" class="text-primary font-medium no-underline inline-block mb-4">← Ödeme listesine dön</a>

        @if (showSavedBanner()) {
            <p class="mb-4 m-0 text-sm font-medium">Ödeme kaydedildi.</p>
        }

        @if (loading()) {
            <app-loading-state message="Ödeme yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (payment()) {
            <app-page-header title="Ödeme" subtitle="Finans" [description]="headerDescription(payment()!)">
                <a
                    actions
                    [routerLink]="['/panel/payments', payment()!.id, 'edit']"
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
                        <h5 class="mt-0 mb-4">Müşteri / hayvan</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Müşteri</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                @if (payment()!.clientId) {
                                    <a [routerLink]="['/panel/clients', payment()!.clientId]" class="text-primary font-medium no-underline">{{
                                        payment()!.clientName
                                    }}</a>
                                } @else {
                                    {{ payment()!.clientName }}
                                }
                            </dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Hayvan</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                @if (payment()!.petId) {
                                    <a [routerLink]="['/panel/pets', payment()!.petId]" class="text-primary font-medium no-underline">{{ payment()!.petName }}</a>
                                } @else {
                                    {{ payment()!.petName }}
                                }
                            </dd>
                        </dl>
                    </div>
                </div>

                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Tutar ve ödeme</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Tutar</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0 font-medium">{{ moneyLine(payment()!) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Para birimi</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ payment()!.currency }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Kanal</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ methodLabel(payment()!.method) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Ödeme zamanı</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDateTime(payment()!.paidAtUtc) }}</dd>
                            @if (payment()!.appointmentId) {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Randevu</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">
                                    <a [routerLink]="['/panel/appointments', payment()!.appointmentId]" class="text-primary font-medium no-underline"
                                        >Randevu kaydına git →</a
                                    >
                                </dd>
                            }
                            @if (payment()!.examinationId) {
                                <dt class="col-span-12 sm:col-span-4 text-muted-color">Muayene</dt>
                                <dd class="col-span-12 sm:col-span-8 m-0">
                                    <a [routerLink]="['/panel/examinations', payment()!.examinationId]" class="text-primary font-medium no-underline"
                                        >Muayene kaydına git →</a
                                    >
                                </dd>
                            }
                        </dl>
                    </div>
                </div>

                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <div class="flex flex-wrap gap-2 items-center justify-between mb-4">
                            <h5 class="mt-0 mb-0">İlgili muayeneler</h5>
                            <a routerLink="/panel/examinations" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (exLoading()) {
                            <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                        } @else if (exError()) {
                            <p class="text-muted-color m-0">{{ exError() }}</p>
                        } @else if (exItems().length === 0) {
                            <app-empty-state message="Bağlamsal muayene bulunamadı." />
                        } @else {
                            <ul class="list-none m-0 p-0">
                                @for (row of exItems(); track row.id) {
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
                            <h5 class="mt-0 mb-0">Son randevular (hayvan)</h5>
                            <a routerLink="/panel/appointments" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (!payment()!.petId) {
                            <app-empty-state message="Hayvan bilgisi yok; randevu özeti gösterilemiyor." />
                        } @else if (apptLoading()) {
                            <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                        } @else if (apptError()) {
                            <p class="text-muted-color m-0">{{ apptError() }}</p>
                        } @else if (apptItems().length === 0) {
                            <app-empty-state [message]="copy.listEmptyMessage" />
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
                        <h5 class="mt-0 mb-4">Notlar</h5>
                        @if (payment()!.note === emptyMark) {
                            <app-empty-state message="Not bulunmuyor." />
                        } @else {
                            <p class="m-0 whitespace-pre-wrap">{{ payment()!.note }}</p>
                        }
                    </div>
                </div>
            </div>
        }
    `
})
export class PaymentDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly paymentsService = inject(PaymentsService);
    private readonly related = inject(DetailRelatedSummariesService);

    readonly copy = PANEL_COPY;
    readonly showSavedBanner = signal(false);

    readonly emptyMark = '—';

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly payment = signal<PaymentDetailVm | null>(null);

    readonly exLoading = signal(false);
    readonly exError = signal<string | null>(null);
    readonly exItems = signal<ExaminationListItemVm[]>([]);

    readonly apptLoading = signal(false);
    readonly apptError = signal<string | null>(null);
    readonly apptItems = signal<AppointmentListItemVm[]>([]);

    private lastId: string | null = null;

    readonly formatDateTime = (v: string | null) => formatDateTimeDisplay(v);
    readonly formatDt = (v: string | null) => formatDateTimeDisplay(v);
    readonly methodLabel = paymentMethodLabel;
    readonly typeDisplay = appointmentTypeDisplayLabel;

    moneyLine(p: PaymentDetailVm): string {
        return formatMoney(p.amount, p.currency || 'TRY');
    }

    headerDescription(p: PaymentDetailVm): string {
        const parts: string[] = [this.moneyLine(p), this.methodLabel(p.method)];
        const paid = p.paidAtUtc?.trim();
        if (paid) {
            parts.push('Ödeme: ' + this.formatDateTime(paid));
        }
        return parts.join(' · ');
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
                        this.error.set('Geçersiz ödeme.');
                        this.loading.set(false);
                        return EMPTY;
                    }
                    this.lastId = id;
                    this.loading.set(true);
                    this.error.set(null);
                    return this.paymentsService.getPaymentById(id);
                })
            )
            .subscribe({
                next: (x) => {
                    this.payment.set(x);
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
        this.paymentsService.getPaymentById(this.lastId).subscribe({
            next: (x) => {
                this.payment.set(x);
                this.loading.set(false);
                this.loadRelatedBlocks(x);
            },
            error: (e: Error) => {
                this.error.set(e.message ?? 'Yükleme hatası');
                this.loading.set(false);
            }
        });
    }

    private loadRelatedBlocks(p: PaymentDetailVm): void {
        this.exLoading.set(true);
        this.exError.set(null);
        this.related.loadRelatedExaminationsForPaymentContext(p.petId, p.clientId).subscribe({
            next: (items) => {
                this.exItems.set(items);
                this.exLoading.set(false);
            },
            error: (e: Error) => {
                this.exError.set(e.message ?? 'Muayeneler yüklenemedi.');
                this.exLoading.set(false);
            }
        });

        this.apptLoading.set(true);
        this.apptError.set(null);
        this.related.loadRecentAppointmentsForPaymentPetContext(p.petId).subscribe({
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
