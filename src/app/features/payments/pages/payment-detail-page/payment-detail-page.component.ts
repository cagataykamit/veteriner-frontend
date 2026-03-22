import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { PaymentDetailVm } from '@/app/features/payments/models/payment-vm.model';
import { PaymentsService } from '@/app/features/payments/services/payments.service';
import { paymentMethodLabel } from '@/app/features/payments/utils/payment-method.utils';
import { paymentStatusLabel, paymentStatusSeverity } from '@/app/features/payments/utils/payment-status.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatDateDisplay, formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { EMPTY, switchMap } from 'rxjs';

@Component({
    selector: 'app-payment-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    template: `
        <a routerLink="/panel/payments" class="text-primary font-medium no-underline inline-block mb-4">← Ödeme listesine dön</a>

        @if (loading()) {
            <app-loading-state message="Ödeme yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (payment()) {
            <app-page-header
                title="Ödeme"
                subtitle="Finans"
                [description]="moneyLine(payment()!) + ' · ' + statusLabel(payment()!.status) + ' · ' + methodLabel(payment()!.method)"
            />

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Genel bilgiler</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Durum</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                <app-status-tag [label]="statusLabel(payment()!.status)" [severity]="statusSeverity(payment()!.status)" />
                            </dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Oluşturulma</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDate(payment()!.createdAtUtc) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Güncellenme</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDate(payment()!.updatedAtUtc) }}</dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Müşteri / hayvan</h5>
                        @if (payment()!.clientId) {
                            <p class="mt-0 mb-2">
                                <a [routerLink]="['/panel/clients', payment()!.clientId]" class="text-primary font-medium no-underline">Müşteri detayı →</a>
                            </p>
                        }
                        @if (payment()!.petId) {
                            <p class="mt-0 mb-3">
                                <a [routerLink]="['/panel/pets', payment()!.petId]" class="text-primary font-medium no-underline">Hayvan detayı →</a>
                            </p>
                        }
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Müşteri</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ payment()!.clientName }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Hayvan</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ payment()!.petName }}</dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Tutar ve yöntem</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Tutar</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0 font-medium">{{ moneyLine(payment()!) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Para birimi</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ payment()!.currency }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Yöntem</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ methodLabel(payment()!.method) }}</dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Tarihler</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Vade</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDate(payment()!.dueDateUtc) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Ödeme</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDateTime(payment()!.paidAtUtc) }}</dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Not</h5>
                        @if (payment()!.note === emptyMark) {
                            <app-empty-state message="Not yok." />
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
    private readonly paymentsService = inject(PaymentsService);

    readonly emptyMark = '—';

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly payment = signal<PaymentDetailVm | null>(null);

    private lastId: string | null = null;

    readonly formatDate = (v: string | null) => formatDateDisplay(v);
    readonly formatDateTime = (v: string | null) => formatDateTimeDisplay(v);
    readonly statusLabel = paymentStatusLabel;
    readonly statusSeverity = paymentStatusSeverity;
    readonly methodLabel = paymentMethodLabel;

    moneyLine(p: PaymentDetailVm): string {
        return formatMoney(p.amount, p.currency || 'TRY');
    }

    ngOnInit(): void {
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
            },
            error: (e: Error) => {
                this.error.set(e.message ?? 'Yükleme hatası');
                this.loading.set(false);
            }
        });
    }
}
