import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { PaymentAllocationVm, PaymentDetailVm } from '@/app/entities/payment/models/payment-vm.model';
import { PaymentsService } from '@/app/entities/payment/services/payments.service';
import { paymentMethodLabel } from '@/app/entities/payment/utils/payment-method.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppDetailIdentityCardComponent } from '@/app/shared/ui/detail-identity-card/app-detail-identity-card.component';
import { AppDetailSubjectLineComponent } from '@/app/shared/ui/detail-subject-line/app-detail-subject-line.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { PAYMENTS_CORRECT_CLAIM, PAYMENTS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ReasonConfirmDialogComponent } from '@/app/shared/ui/reason-confirm-dialog/reason-confirm-dialog.component';
import { RouteEntityLoader } from '@/app/shared/panel/route-entity-loader';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

@Component({
    selector: 'app-payment-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        ButtonModule,
        AppPageHeaderComponent,
        AppDetailIdentityCardComponent,
        AppDetailSubjectLineComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        ReasonConfirmDialogComponent
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (showSavedBanner()) {
            <p class="mb-4 m-0 text-sm font-medium">
                Ödeme kaydedildi.
                @switch (eDocumentOutcome()) {
                    @case ('issued') {
                        e-Belge kesildi.
                    }
                    @case ('failed') {
                        <span class="text-danger">e-Belge kesilemedi; <a routerLink="/panel/e-documents" [queryParams]="{ view: 'undocumented' }">belgesiz ücretlerden</a> yeniden deneyin.</span>
                    }
                    @case ('none') {
                        <span class="text-muted-color">Tamamen ödenen belgesiz ücret yok; e-Belge kesilmedi.</span>
                    }
                }
            </p>
        }

        @if (loading()) {
            <app-loading-state message="Ödeme yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (payment(); as p) {
            <app-page-header categoryLink="/panel/payments" categoryLinkLabel="Ödeme listesine dön" />

            <!-- Kimlik kartı: tutar başlık, ödeme zamanı, kanal, müşteri/hasta; sağda Düzenle ve gerekçeli İptal et (salt okunurda gösterilmez; tek eylem için şerit açılmaz); gösterge şeridi (tutar, kanal, zaman, randevu, muayene). -->
            <app-detail-identity-card icon="pi pi-wallet" [title]="moneyLine(p)" [subtitle]="formatPaidAtUtc(p.paidAtUtc)" [meta]="'Yöntem: ' + methodLabel(p.method)" ariaLabel="Ödeme kimliği" testId="payment-identity-card">
                <app-detail-subject-line [petId]="p.petId" [petName]="p.petName" [clientId]="p.clientId" [clientName]="p.clientName" />
                <ng-container actions>
                    @if (canUpdatePayment && !ro.mutationBlocked()) {
                        <a [routerLink]="['/panel/payments', p.id, 'edit']" pButton type="button" class="p-button-outlined p-button-secondary"><i class="pi pi-pencil"></i>Düzenle</a>
                    } @else if (canUpdatePayment && ro.mutationBlocked()) {
                        <button pButton type="button" [disabled]="true" class="p-button-outlined p-button-secondary"><i class="pi pi-lock"></i>Düzenle (salt okunur)</button>
                    }
                    @if (canVoidPayment && !ro.mutationBlocked()) {
                        <button pButton type="button" class="p-button-danger p-button-outlined" (click)="voidVisible = true"><i class="pi pi-ban"></i>İptal et</button>
                    }
                </ng-container>
                <div stat>
                    <dt>Tutar</dt>
                    <dd class="font-semibold text-surface-900 dark:text-surface-0 tabular-nums">{{ moneyLine(p) }}</dd>
                </div>
                @if (p.creditedAmount > 0) {
                    <div stat>
                        <dt>Krediye yazılan</dt>
                        <dd data-testid="payment-credited">
                            <span class="font-semibold text-surface-900 dark:text-surface-0 tabular-nums">{{ creditedLine(p) }}</span>
                            <span class="block text-sm text-muted-color">Ücretlere bağlanmayan kısım müşteri kredisinde</span>
                        </dd>
                    </div>
                }
                <div stat>
                    <dt>Yöntem</dt>
                    <dd class="font-semibold text-surface-900 dark:text-surface-0">{{ methodLabel(p.method) }}</dd>
                </div>
                @if (p.cashRegisterName) {
                    <div stat>
                        <dt>Kasa</dt>
                        <dd class="font-semibold text-surface-900 dark:text-surface-0" data-testid="payment-cash-register">{{ p.cashRegisterName }}</dd>
                    </div>
                }
                <div stat>
                    <dt>Ödeme zamanı</dt>
                    <dd class="font-semibold text-surface-900 dark:text-surface-0 tabular-nums">{{ formatPaidAtUtc(p.paidAtUtc) }}</dd>
                </div>
                <div stat>
                    <dt>Randevu</dt>
                    <dd>
                        @if (p.appointmentId) {
                            <a [routerLink]="['/panel/appointments', p.appointmentId]" class="text-primary font-semibold no-underline touch:touch-hit">Randevu kaydına git →</a>
                        } @else {
                            <span class="field-empty">Bağlı randevu yok</span>
                        }
                    </dd>
                </div>
                <div stat>
                    <dt>Muayene</dt>
                    <dd>
                        @if (p.examinationId) {
                            <a [routerLink]="['/panel/examinations', p.examinationId]" class="text-primary font-semibold no-underline touch:touch-hit">Muayene kaydına git →</a>
                        } @else {
                            <span class="field-empty">Bağlı muayene yok</span>
                        }
                    </dd>
                </div>
            </app-detail-identity-card>


            <!-- Ödemenin hangi ücretlere sayıldığı ilk ekranda (K-04); randevu ve muayene bağı kimlik kartında. Notlar altta. -->
            <div class="flex flex-col gap-4">
                <section class="card mb-0" aria-labelledby="payment-allocations-title" data-testid="payment-allocations">
                    <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
                        <h5 id="payment-allocations-title" class="m-0">Kapatılan ücretler</h5>
                        @if (p.clientId) {
                            <a routerLink="/panel/charges" [queryParams]="{ clientId: p.clientId }" class="text-primary text-sm font-medium no-underline touch:touch-hit">Müşterinin ücretleri →</a>
                        }
                    </div>
                    @if (allocLoading()) {
                        <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                    } @else if (allocError()) {
                        <app-error-state [detail]="allocError()!" (retry)="loadAllocations(p.id)" />
                    } @else if (allocations().length === 0) {
                        <p class="field-empty m-0">Bu ödeme bir ücrete sayılmadı{{ p.creditedAmount > 0 ? '; tutar müşteri kredisinde' : '' }}.</p>
                    } @else {
                        <ul class="list-none m-0 p-0">
                            @for (row of allocations(); track row.chargeId) {
                                <li class="flex gap-3 items-baseline justify-between py-2 border-b border-surface-200 dark:border-surface-700 last:border-b-0 last:pb-0 min-w-0" data-testid="payment-allocation">
                                    <span class="min-w-0 break-words">{{ row.description }}</span>
                                    <span class="shrink-0 font-semibold tabular-nums">{{ money(row.amount, p) }}</span>
                                </li>
                            }
                        </ul>
                    }
                </section>
                <div class="card mb-0">
                    <h5 class="mt-0 mb-3">Notlar</h5>
                    @if (p.note === emptyMark) {
                        <p class="m-0 field-empty">Not bulunmuyor</p>
                    } @else {
                        <p class="m-0 whitespace-pre-wrap">{{ p.note }}</p>
                    }
                </div>
            </div>
        }

        <app-reason-confirm-dialog
            [(visible)]="voidVisible"
            header="Ödemeyi iptal et"
            [summary]="payment() ? payment()!.clientName + ' · ' + headerDescription(payment()!) : null"
            description="Ödeme hiç alınmamış sayılır: bağlı olduğu ücretlerin açık tutarı artar, listelerden ve bakiyeden düşer; ödemeden doğan kullanılmamış kredi de iptal olur. Geri alınamaz; yanlışsa doğrusu yeni ödeme olarak girilir."
            confirmLabel="Ödemeyi iptal et"
            failureFallback="Ödeme iptal edilemedi."
            [execute]="voidPayment"
            (confirmed)="afterVoid()"
        />
    `
})
export class PaymentDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly paymentsService = inject(PaymentsService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly copy = PANEL_COPY;
    readonly showSavedBanner = signal(false);
    /** Ödeme ekranında "e-Belge kes" seçildiyse sonucu (`issued` / `failed` / `none`). */
    readonly eDocumentOutcome = signal<string | null>(null);
    readonly canUpdatePayment = this.auth.hasOperationClaim(PAYMENTS_UPDATE_CLAIM);
    readonly canVoidPayment = this.auth.hasOperationClaim(PAYMENTS_CORRECT_CLAIM);
    voidVisible = false;
    readonly voidPayment = (reason: string) => this.paymentsService.voidPayment(this.payment()!.id, reason);

    readonly emptyMark = '—';

    private readonly loader = new RouteEntityLoader<PaymentDetailVm>({
        fetch: (id) => this.paymentsService.getPaymentById(id),
        invalidIdMessage: 'Geçersiz ödeme.',
        onLoaded: (x) => this.loadAllocations(x.id)
    });

    readonly loading = this.loader.loading;
    readonly error = this.loader.error;
    readonly payment = this.loader.value;

    readonly allocLoading = signal(false);
    readonly allocError = signal<string | null>(null);
    readonly allocations = signal<PaymentAllocationVm[]>([]);

    readonly formatPaidAtUtc = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly methodLabel = paymentMethodLabel;

    money(amount: number, p: PaymentDetailVm): string {
        return formatMoney(amount, p.currency || 'TRY');
    }

    moneyLine(p: PaymentDetailVm): string {
        return formatMoney(p.amount, p.currency || 'TRY');
    }

    creditedLine(p: PaymentDetailVm): string {
        return formatMoney(p.creditedAmount, p.currency || 'TRY');
    }

    headerDescription(p: PaymentDetailVm): string {
        const parts: string[] = [this.moneyLine(p), this.methodLabel(p.method)];
        const paid = p.paidAtUtc?.trim();

        if (paid) {
            parts.push('Ödeme: ' + this.formatPaidAtUtc(paid));
        }

        return parts.join(' · ');
    }

    ngOnInit(): void {
        if (this.route.snapshot.queryParamMap.get('saved') === '1') {
            this.showSavedBanner.set(true);
            this.eDocumentOutcome.set(this.route.snapshot.queryParamMap.get('eDocument'));
            void this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { saved: null, eDocument: null },
                queryParamsHandling: '',
                replaceUrl: true
            });
        }

        this.loader.init();
    }

    /** İptal edilen ödeme artık okunamaz (404); listeye dönülür. */
    afterVoid(): void {
        void this.router.navigate(['/panel/payments']);
    }

    reload(): void {
        this.loader.reload();
    }

    loadAllocations(paymentId: string): void {
        this.allocLoading.set(true);
        this.allocError.set(null);
        this.paymentsService.getPaymentAllocations(paymentId).subscribe({
            next: (items) => {
                this.allocations.set(items);
                this.allocLoading.set(false);
            },
            error: (e: Error) => {
                this.allocError.set(panelHttpFailureMessage(e, 'Kapatılan ücretler yüklenemedi.'));
                this.allocLoading.set(false);
            }
        });
    }
}
