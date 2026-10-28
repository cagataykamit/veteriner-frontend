import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { SubscriptionDiscountCardComponent } from '@/app/entities/sales-partner/components/subscription-discount-card.component';
import { ExampleClinicLoadCardComponent } from '@/app/entities/example-clinic/components/example-clinic-load-card.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import type { PendingPlanChangeStatusKey, PendingPlanChangeTypeKey, PendingPlanChangeVm, SubscriptionCheckoutSessionVm, SubscriptionSummaryVm } from '@/app/entities/subscription/models/subscription-vm.model';
import { SUBSCRIPTION_BILLING_PERIOD_LABELS } from '@/app/features/subscriptions/utils/subscription-billing-period.utils';
import { shouldOfferManualCheckoutFinalize } from '@/app/entities/subscription/utils/subscription-checkout-provider.utils';
import { subscriptionCheckoutStatusLabel, subscriptionCheckoutStatusSeverity } from '@/app/entities/subscription/utils/subscription-checkout-status.utils';
import { subscriptionPlanLabel } from '@/app/entities/subscription/utils/subscription-plan.utils';
import {
    expiredReadOnlyBannerMessage,
    isActiveTrialingSubscription,
    isExpiredReadOnlySubscription,
    isRenewalCheckoutContext,
    isSubscriptionPeriodEndPast,
    nextRenewalWaitingText,
    shouldShowMisleadingNextRenewal
} from '@/app/features/subscriptions/utils/subscription-access.utils';
import { SubscriptionPlanCardsComponent } from '@/app/features/subscriptions/components/subscription-plan-cards.component';
import { SubscriptionSummaryCardsComponent } from '@/app/features/subscriptions/components/subscription-summary-cards.component';
import { CheckoutFlowService } from '@/app/features/subscriptions/services/checkout-flow.service';
import { CheckoutReturnVerificationService } from '@/app/features/subscriptions/services/checkout-return-verification.service';
import { TrDatePipe, TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

@Component({
    selector: 'app-subscription-page',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule,
        ToastModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppEmptyStateComponent,
        AppStatusTagComponent,
        SubscriptionDiscountCardComponent,
        ExampleClinicLoadCardComponent,
        SubscriptionSummaryCardsComponent,
        SubscriptionPlanCardsComponent,
        TrDatePipe,
        TrDateTimePipe
    ],
    providers: [MessageService, CheckoutFlowService, CheckoutReturnVerificationService],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <p-toast position="bottom-right" />
        <app-page-header title="Abonelik" [description]="subscriptionHeaderDescription" />

        @if (flow.summary(); as s) {
            @if (isExpiredReadOnlySubscription(s)) {
                <div class="card mb-4 border-round bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/60" role="status">
                    <p class="m-0 text-sm text-color font-medium">{{ expiredReadOnlyBannerMessage(s) }}</p>
                </div>
            }
        }

        @if (flow.postCheckoutSyncing() && !flow.error() && flow.showManageFlowChrome()) {
            <div class="card mb-4 border-round bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                <p class="m-0 text-sm text-color font-medium">Ödeme sonucu işleniyor.</p>
                <p class="m-0 text-sm text-color mt-2">Paket değişikliği birkaç saniye içinde yansıyabilir.</p>
            </div>
        }

        @if (flow.loading()) {
            <app-loading-state message="Abonelik özeti yükleniyor…" />
        } @else if (flow.error(); as err) {
            <div class="card">
                <app-error-state title="Abonelik özeti alınamadı" [detail]="err" (retry)="flow.reload()" />
            </div>
        } @else if (flow.summary(); as s) {
            @if (flow.returnBanner(); as banner) {
                <div
                    class="card mb-4 border-round"
                    [ngClass]="{
                        'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800': banner.severity === 'info',
                        'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800': banner.severity === 'success',
                        'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800': banner.severity === 'warn',
                        'bg-surface-100 dark:bg-surface-800 border-surface-200 dark:border-surface-700': banner.severity === 'secondary',
                        'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800': banner.severity === 'error'
                    }"
                >
                    <p class="m-0 text-sm text-color font-medium">{{ banner.title }}</p>
                    @if (banner.detail) {
                        <p class="m-0 text-sm text-color mt-2">{{ banner.detail }}</p>
                    }
                    @if (banner.showRefreshCta) {
                        <div class="mt-3">
                            <button
                                pButton
                                type="button"
                                severity="secondary"
                                [disabled]="flow.subscriptionRefreshLoading() || flow.postCheckoutSyncing()"
                                (click)="flow.refreshSubscriptionSnapshot()"
                            ><i class="p-button-icon" [class]="flow.subscriptionRefreshLoading() ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'"></i>Durumu yenile</button>
                        </div>
                    }
                </div>
            }

            <div class="grid grid-cols-12 gap-6">
                <app-subscription-summary-cards [summary]="s" [canManage]="flow.canManageSubscriptionOperations(s)" />

                <app-example-clinic-load-card class="col-span-12" [canManage]="flow.canManageSubscriptionOperations(s)" [trialing]="isTrialingSubscription(s)" [writable]="!isExpiredReadOnlySubscription(s)" />

                <app-subscription-discount-card class="col-span-12" [canManage]="flow.canManageSubscriptionOperations(s)" />

                <app-subscription-plan-cards
                    class="col-span-12"
                    [summary]="s"
                    [canManage]="flow.canManageSubscriptionOperations(s)"
                    [(billingPeriod)]="flow.selectedBillingPeriod"
                    [checkoutSession]="flow.checkoutSession()"
                    [busy]="flow.planActionsBusy()"
                    [busyPlanCodes]="[flow.planActionLoadingCode(), flow.schedulingDowngradeCode()]"
                    [actionError]="flow.planActionError()"
                    [actionInfo]="flow.planActionInfo()"
                    (planAction)="flow.onPlanAction($event)"
                />

                @if (s.pendingPlanChange; as pending) {
                    <div class="col-span-12">
                        <div class="card mb-0">
                            <h5 class="mt-0 mb-3">Bekleyen plan değişikliği</h5>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                                <div>
                                    <div class="text-muted-color mb-1">Mevcut plan</div>
                                    <div class="font-medium">{{ subscriptionPlanLabel(pending.currentPlanCode, null) }}</div>
                                </div>
                                <div>
                                    <div class="text-muted-color mb-1">Hedef plan</div>
                                    <div class="font-medium">{{ subscriptionPlanLabel(pending.targetPlanCode, null) }}</div>
                                </div>
                                <div>
                                    <div class="text-muted-color mb-1">Geçiş türü</div>
                                    <div>{{ pendingPlanChangeTypeLabel(pending.changeType, s) }}</div>
                                </div>
                                <div>
                                    <div class="text-muted-color mb-1">Durum</div>
                                    <div>{{ pendingPlanChangeStatusLabel(pending.status) }}</div>
                                </div>
                                <div>
                                    <div class="text-muted-color mb-1">{{ pendingPlanChangeEffectiveDateLabel(s) }}</div>
                                    <div>{{ pendingPlanChangeEffectiveDate(pending, s) | trDate }}</div>
                                </div>
                                @if (shouldShowMisleadingNextRenewal(s)) {
                                    <div>
                                        <div class="text-muted-color mb-1">Sonraki yenileme</div>
                                        <div>{{ s.nextBillingAtUtc || s.currentPeriodEndUtc | trDate }}</div>
                                    </div>
                                } @else if (!isTrialingSubscription(s) && (isExpiredReadOnlySubscription(s) || isSubscriptionPeriodEndPast(s))) {
                                    <div>
                                        <div class="text-muted-color mb-1">Yenileme bekliyor</div>
                                        <div>{{ nextRenewalWaitingText(s) }}</div>
                                    </div>
                                }
                            </div>
                            @if (pending.changeType === 'downgrade') {
                                <p class="m-0 mb-3 text-sm text-muted-color">
                                    @if (isTrialingSubscription(s)) {
                                        Bu değişiklik ödeme gerektirmez. Deneme süreniz bittiğinde
                                        <span class="font-medium text-color">{{ subscriptionPlanLabel(pending.targetPlanCode, null) }}</span>
                                        paketiyle devam edilecektir.
                                    } @else {
                                        Bu değişiklik ödeme gerektirmez. Mevcut dönem bitiminde
                                        <span class="font-medium text-color">{{ subscriptionPlanLabel(pending.targetPlanCode, null) }}</span>
                                        paketine geçilecektir.
                                    }
                                </p>
                            }
                            @if (flow.canManageSubscriptionOperations(s)) {
                                <div class="flex items-center gap-2">
                                    <button
                                        pButton
                                        type="button"
                                        severity="secondary"
                                        [disabled]="flow.pendingCancelLoading() || flow.planActionLoadingCode() !== null || flow.finalizing() || flow.postCheckoutSyncing()"
                                        (click)="flow.cancelPendingPlanChange()"
                                    ><i class="p-button-icon" [class]="flow.pendingCancelLoading() ? 'pi pi-spin pi-spinner' : 'pi pi-times'"></i>{{ pendingPlanChangeCancelLabel(s) }}</button>
                                </div>
                                @if (flow.pendingCancelError()) {
                                    <p class="text-red-500 mt-3 mb-0 text-sm">{{ flow.pendingCancelError() }}</p>
                                }
                            }
                        </div>
                    </div>
                }

                @if (flow.showSubscriptionCheckoutCard()) {
                    <div class="col-span-12">
                        <div class="card mb-0">
                            <h5 class="mt-0 mb-3">Ödeme durumu</h5>
                            @if (flow.checkoutLoading()) {
                                <app-loading-state message="Ödeme durumu yükleniyor…" />
                            } @else if (flow.checkoutError()) {
                                <app-error-state [detail]="flow.checkoutError()!" (retry)="flow.retryCheckout()" />
                            } @else if (flow.checkoutSession(); as session) {
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                                    <div>
                                        <div class="text-muted-color mb-1">Hedef paket</div>
                                        <div class="font-medium">{{ checkoutTargetPlanLabel(session, s) }}</div>
                                    </div>
                                    <div>
                                        <div class="text-muted-color mb-1">Durum</div>
                                        <app-status-tag [label]="checkoutStatusLabel(session, s)" [severity]="checkoutStatusSeverity(session)" />
                                    </div>
                                    <div>
                                        <div class="text-muted-color mb-1">Ödeme dönemi</div>
                                        <div>{{ billingPeriodLabels[session.billingPeriod] }}</div>
                                    </div>
                                    <div>
                                        <div class="text-muted-color mb-1">Ödeme oturumu sonu</div>
                                        <div>{{ session.expiresAtUtc | trDateTime }}</div>
                                    </div>
                                    <div class="md:col-span-2">
                                        <div class="text-muted-color mb-1">Ödeme</div>
                                        @if (session.checkoutUrl) {
                                            <p class="m-0 text-sm text-color">Güvenli ödeme sayfasına yönlendirileceksiniz. Ödemeniz iyzico altyapısı üzerinden tamamlanır ve işlem sonrası bu sayfaya döneceksiniz.</p>
                                        } @else {
                                            <span class="text-muted-color text-sm">Ödeme bağlantısı henüz hazır değil. Durumu yenileyerek tekrar deneyin.</span>
                                        }
                                    </div>
                                    @if (session.proratedChargeMinor !== null || session.prorationRatio !== null) {
                                        <div class="md:col-span-2 p-3 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                                            @if (isRenewalCheckoutContext(s)) {
                                                <p class="m-0 text-sm text-color">
                                                    Ödenecek tutar:
                                                    <span class="font-medium">{{ formatMinorMoney(session.proratedChargeMinor, session.chargeCurrencyCode) }}</span>
                                                </p>
                                            } @else if (session.billingPeriod === 'Yearly' && s.billingPeriod === 'Monthly') {
                                                <p class="m-0 text-sm text-color">
                                                    Yıllık ödeme tutarı (bu ayın kalan günleri düşüldü):
                                                    <span class="font-medium">{{ formatMinorMoney(session.proratedChargeMinor, session.chargeCurrencyCode) }}</span>
                                                </p>
                                                <p class="m-0 mt-1 text-xs text-muted-color">Yıllık dönem ödeme tarihinde başlar.</p>
                                            } @else {
                                                <p class="m-0 text-sm text-color">
                                                    Kalan dönem için hesaplanan fark:
                                                    <span class="font-medium">{{ formatMinorMoney(session.proratedChargeMinor, session.chargeCurrencyCode) }}</span>
                                                    @if (session.prorationRatio !== null) {
                                                        <span> (oran: {{ prorationPercentText(session.prorationRatio) }})</span>
                                                    }
                                                </p>
                                                <p class="m-0 mt-1 text-xs text-muted-color">Bir sonraki yenileme tarihi değişmez.</p>
                                            }
                                        </div>
                                    }
                                </div>
                                @if (flow.finalizeError()) {
                                    <p class="text-red-500 mt-0 mb-3 text-sm" role="alert">{{ flow.finalizeError() }}</p>
                                }
                                <div class="flex flex-wrap gap-2">
                                    @if (session.checkoutUrl) {
                                        <button pButton type="button" (click)="flow.continueCheckout()" [disabled]="flow.planActionsBusy()"><i class="p-button-icon pi pi-external-link"></i>Ödemeye devam et</button>
                                    }
                                    <button
                                        pButton
                                        type="button"
                                        severity="secondary"
                                        [disabled]="flow.planActionsBusy() || flow.checkoutLoading()"
                                        (click)="flow.refreshCheckout()"
                                    ><i class="p-button-icon" [class]="flow.checkoutLoading() ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'"></i>Durumu yenile</button>
                                    @if (shouldOfferManualCheckoutFinalize(session)) {
                                        <button
                                            pButton
                                            type="button"
                                            severity="secondary"
                                            [disabled]="!session.canContinue || flow.planActionsBusy()"
                                            (click)="flow.finalizeCheckout()"
                                        ><i class="p-button-icon" [class]="flow.finalizing() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Ödemeyi tamamla</button>
                                    }
                                </div>
                                @if (!session.canContinue) {
                                    <p class="text-sm text-muted-color mt-3 mb-0">Bu ödeme işlemi artık devam ettirilemiyor. Plan değişikliğini yeniden başlatabilirsiniz.</p>
                                }
                            } @else {
                                <p class="text-sm text-muted-color m-0 mb-0">Henüz başlatılmış bir ödeme işlemi bulunmuyor.</p>
                                @if (isExpiredReadOnlySubscription(s)) {
                                    <div class="mt-3">
                                        <button
                                            pButton
                                            type="button"
                                            [disabled]="flow.planActionsBusy() || !s.planCode || flow.checkoutLoading()"
                                            (click)="flow.startPaymentForCurrentPlan()"
                                        ><i class="p-button-icon" [class]="flow.planActionLoadingCode() === s.planCode || flow.checkoutLoading() ? 'pi pi-spin pi-spinner' : 'pi pi-credit-card'"></i>Ödeme başlat</button>
                                    </div>
                                }
                            }
                        </div>
                    </div>
                }

                @if (flow.canManageSubscriptionOperations(s)) {
                    <div class="col-span-12">
                        <div class="card mb-0">
                            <h5 class="mt-0 mb-3">Bilgi</h5>
                            <ul class="m-0 pl-4 text-sm text-muted-color flex flex-col gap-1">
                                @if (isTrialingSubscription(s)) {
                                    <li>Deneme süreniz boyunca plan değişiklikleri ödeme gerektirmez.</li>
                                    <li>Seçtiğiniz paket deneme süreniz bittiğinde geçerli olur.</li>
                                } @else {
                                    <li>Ödemeler iyzico altyapısı üzerinden güvenli şekilde tamamlanır.</li>
                                    <li>Plan değişiklikleri ödeme tamamlandıktan sonra otomatik olarak aboneliğinize yansıtılır.</li>
                                    @if (!isRenewalCheckoutContext(s)) {
                                        <li>Paket düşürme işlemleri mevcut fatura dönemi sonunda uygulanır.</li>
                                    }
                                }
                            </ul>
                        </div>
                    </div>
                }
            </div>
        } @else {
            <div class="card">
                <app-empty-state message="Abonelik özeti bulunamadı." />
            </div>
        }
    `
})
export class SubscriptionPageComponent implements OnInit {
    /** Sayfa durumu ve ödeme akışı; sayfa bileşeninde sağlanır. */
    readonly flow = inject(CheckoutFlowService);

    readonly subscriptionHeaderDescription = 'Kurum abonelik özetinizi, mevcut paketinizi ve plan değişikliği işlemlerinizi görüntüleyin.';
    readonly billingPeriodLabels = SUBSCRIPTION_BILLING_PERIOD_LABELS;
    readonly shouldOfferManualCheckoutFinalize = shouldOfferManualCheckoutFinalize;
    readonly subscriptionPlanLabel = subscriptionPlanLabel;
    readonly isTrialingSubscription = isActiveTrialingSubscription;
    readonly isExpiredReadOnlySubscription = isExpiredReadOnlySubscription;
    readonly expiredReadOnlyBannerMessage = expiredReadOnlyBannerMessage;
    readonly isSubscriptionPeriodEndPast = isSubscriptionPeriodEndPast;
    readonly shouldShowMisleadingNextRenewal = shouldShowMisleadingNextRenewal;
    readonly isRenewalCheckoutContext = isRenewalCheckoutContext;
    readonly nextRenewalWaitingText = nextRenewalWaitingText;

    ngOnInit(): void {
        this.flow.start();
    }

    checkoutStatusLabel(session: SubscriptionCheckoutSessionVm, summary: SubscriptionSummaryVm): string {
        return subscriptionCheckoutStatusLabel(session.status, {
            renewalCheckout: isRenewalCheckoutContext(summary)
        });
    }

    checkoutStatusSeverity(session: SubscriptionCheckoutSessionVm) {
        return subscriptionCheckoutStatusSeverity(session.status);
    }

    checkoutTargetPlanLabel(session: SubscriptionCheckoutSessionVm, summary: SubscriptionSummaryVm): string {
        const code = session.targetPlanCode?.trim();

        if (!code) {
            return '—';
        }

        const plan = summary.availablePlans.find((x) => x.code.trim().toLowerCase() === code.toLowerCase());

        return subscriptionPlanLabel(code, plan?.name ?? null);
    }

    pendingPlanChangeEffectiveDateLabel(s: SubscriptionSummaryVm): string {
        return isActiveTrialingSubscription(s) ? 'Deneme bitişi' : 'Uygulanma tarihi';
    }

    pendingPlanChangeEffectiveDate(pending: PendingPlanChangeVm, s: SubscriptionSummaryVm): string | null | undefined {
        if (isActiveTrialingSubscription(s)) {
            return pending.effectiveAtUtc || s.trialEndsAtUtc || s.currentPeriodEndUtc;
        }

        return pending.effectiveAtUtc || s.currentPeriodEndUtc || s.nextBillingAtUtc;
    }

    pendingPlanChangeCancelLabel(summary: SubscriptionSummaryVm): string {
        return isActiveTrialingSubscription(summary) ? 'Plan değişikliğini iptal et' : 'Bekleyen geçişi iptal et';
    }

    pendingPlanChangeTypeLabel(type: PendingPlanChangeTypeKey, summary: SubscriptionSummaryVm): string {
        if (type === 'downgrade') {
            return isActiveTrialingSubscription(summary) ? 'Deneme bitiminde plan değişikliği' : 'Dönem sonunda paket düşürme';
        }

        if (type === 'upgrade') {
            return 'Yükseltme';
        }

        return 'Bilinmiyor';
    }

    pendingPlanChangeStatusLabel(status: PendingPlanChangeStatusKey): string {
        if (status === 'pending') {
            return 'Beklemede';
        }

        if (status === 'scheduled') {
            return 'Planlandı';
        }

        if (status === 'cancelled') {
            return 'İptal edildi';
        }

        if (status === 'applied') {
            return 'Uygulandı';
        }

        return 'Bilinmiyor';
    }

    formatMinorMoney(minor: number | null, currencyCode: string | null): string {
        if (minor === null) {
            return '—';
        }

        const amount = minor / 100;
        const ccy = currencyCode?.trim() || 'TRY';

        try {
            return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: ccy, maximumFractionDigits: 2 }).format(amount);
        } catch {
            return `${amount.toFixed(2)} ${ccy}`;
        }
    }

    prorationPercentText(ratio: number | null): string {
        if (ratio === null) {
            return '—';
        }

        const pct = ratio <= 1 ? ratio * 100 : ratio;

        return `${Math.max(0, pct).toFixed(0)}%`;
    }
}
