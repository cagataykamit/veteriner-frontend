import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { forkJoin, Observable, of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { SUBSCRIPTIONS_MANAGE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatDateDisplay, formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import type {
    PendingPlanChangeStatusKey,
    PendingPlanChangeTypeKey,
    PendingPlanChangeVm,
    SubscriptionCheckoutSessionVm,
    SubscriptionPlanVm,
    SubscriptionSummaryVm
} from '@/app/features/subscriptions/models/subscription-vm.model';
import type { SubscriptionSummaryRequestOptions } from '@/app/features/subscriptions/services/subscriptions.service';
import { SubscriptionsService } from '@/app/features/subscriptions/services/subscriptions.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { shouldOfferManualCheckoutFinalize } from '@/app/features/subscriptions/utils/subscription-checkout-provider.utils';
import {
    hasSubscriptionCheckoutReturnQuery,
    parseSubscriptionCheckoutReturn,
    type ParsedSubscriptionCheckoutReturn
} from '@/app/features/subscriptions/utils/subscription-checkout-return.utils';
import {
    clearStoredCheckoutSessionId,
    consumeExpectingHostedCheckoutReturn,
    hasUpgradeSuccessAck,
    markExpectingHostedCheckoutReturn,
    markUpgradeSuccessAck,
    readStoredCheckoutSessionId,
    writeStoredCheckoutSessionId
} from '@/app/features/subscriptions/utils/subscription-checkout-storage.utils';
import {
    subscriptionCheckoutStatusLabel,
    subscriptionCheckoutStatusSeverity
} from '@/app/features/subscriptions/utils/subscription-checkout-status.utils';
import {
    subscriptionPlanLabel,
    subscriptionPlanLimitLabels,
    subscriptionPlanRank
} from '@/app/features/subscriptions/utils/subscription-plan.utils';
import { subscriptionStatusLabel, subscriptionStatusSeverity } from '@/app/features/subscriptions/utils/subscription-status.utils';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';

type ReturnBannerSeverity = 'info' | 'success' | 'warn' | 'secondary' | 'error';

/** Ödeme dönüşü sonrası üst düzey UX fazı (banner + processing ile uyumlu). */
type PostCheckoutPhase = 'idle' | 'processing' | 'success' | 'warning' | 'error';

interface ReturnBannerVm {
    readonly severity: ReturnBannerSeverity;
    readonly title: string;
    readonly detail?: string;
    /** Özet + varsa checkout’u yeniden çek (sayfa yenilemeden). */
    readonly showRefreshCta?: boolean;
}

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
        AppStatusTagComponent
    ],
    providers: [MessageService],
    template: `
        <p-toast position="bottom-right" />
        <app-page-header title="Abonelik" subtitle="Paket & Abonelik" [description]="subscriptionHeaderDescription()" />

        @if (postCheckoutSyncing() && !error() && showManageFlowChrome()) {
            <div class="card mb-4 border-round bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                <p class="m-0 text-sm text-color font-medium">Ödeme sonucu işleniyor.</p>
                <p class="m-0 text-sm text-color mt-2">Paket değişikliği birkaç saniye içinde yansıyabilir.</p>
            </div>
        }

        @if (loading()) {
            <app-loading-state message="Abonelik özeti yükleniyor…" />
        } @else if (error(); as err) {
            <div class="card">
                <app-error-state title="Abonelik özeti alınamadı" [detail]="err" (retry)="reload()" />
            </div>
        } @else if (summary(); as s) {
            @if (returnBanner(); as banner) {
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
                            <p-button
                                type="button"
                                label="Durumu yenile"
                                icon="pi pi-refresh"
                                severity="secondary"
                                [loading]="subscriptionRefreshLoading()"
                                [disabled]="subscriptionRefreshLoading() || postCheckoutSyncing()"
                                (onClick)="refreshSubscriptionSnapshot()"
                            />
                        </div>
                    }
                </div>
            }

            <div class="grid grid-cols-12 gap-6">
                <div class="col-span-12">
                    <div class="card mb-0">
                        <h5 class="mt-0 mb-4">Kurum özeti</h5>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="min-w-0">
                                <div class="text-muted-color text-sm mb-1">Kurum</div>
                                <div class="font-medium break-words">{{ s.tenantName }}</div>
                            </div>
                            <div class="min-w-0">
                                <div class="text-muted-color text-sm mb-1">Mevcut plan</div>
                                <div class="font-medium break-words">{{ currentPlanLabel(s) }}</div>
                            </div>
                            <div class="min-w-0">
                                <div class="text-muted-color text-sm mb-1">Durum</div>
                                <app-status-tag [label]="statusLabel(s)" [severity]="statusSeverity(s)" />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-span-12 lg:col-span-6">
                    <div class="card mb-0 h-full">
                        <h5 class="mt-0 mb-4">Dönem bilgisi</h5>
                        <div class="flex flex-col gap-3">
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-muted-color">{{ periodStartLabel(s) }}</span>
                                <span class="font-medium text-right">{{ formatDate(periodStartDate(s)) }}</span>
                            </div>
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-muted-color">{{ periodEndLabel(s) }}</span>
                                <span class="font-medium text-right">{{ formatDate(periodEndDate(s)) }}</span>
                            </div>
                            @if (!isTrialingSubscription(s)) {
                                <div class="flex items-center justify-between gap-2">
                                    <span class="text-muted-color">Sonraki yenileme</span>
                                    <span class="font-medium text-right">{{ formatDate(s.nextBillingAtUtc || s.currentPeriodEndUtc) }}</span>
                                </div>
                            }
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-muted-color">{{ remainingDaysRowLabel(s) }}</span>
                                <span class="font-medium text-right">{{ daysRemainingText(s.daysRemaining) }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-span-12 lg:col-span-6">
                    <div class="card mb-0 h-full">
                        <h5 class="mt-0 mb-4">Erişim durumu</h5>
                        <div class="flex flex-col gap-3 mb-4">
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-muted-color">Kurum erişimi</span>
                                <span class="font-medium">{{ tenantAccessModeLabel(s.isReadOnly) }}</span>
                            </div>
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-muted-color">Aboneliği yönetebilir</span>
                                <span class="font-medium">{{ boolText(s.canManageSubscription) }}</span>
                            </div>
                        </div>
                        @if (canManageSubscriptionOperations(s)) {
                            <div class="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                                <p class="m-0 text-sm text-color">{{ subscriptionManageFlowHint() }}</p>
                            </div>
                        } @else {
                            <div class="p-3 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                                <p class="m-0 text-sm text-color">Plan değişikliği için kurum yöneticinizle iletişime geçin.</p>
                            </div>
                        }
                    </div>
                </div>

                <div class="col-span-12">
                    <div class="card mb-0">
                        <h5 class="mt-0 mb-4">{{ canManageSubscriptionOperations(s) ? 'Kullanılabilir planlar' : 'Plan bilgileri' }}</h5>
                        @if (s.availablePlans.length === 0) {
                            <app-empty-state message="Plan listesi bulunamadı." />
                        } @else {
                            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                @for (plan of s.availablePlans; track plan.code) {
                                    <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3 min-w-0">
                                        <div class="flex items-center justify-between gap-2">
                                            <div class="font-medium break-words">{{ planLabel(plan) }}</div>
                                            @if (isCurrentPlan(plan, s)) {
                                                <span class="text-xs px-2 py-1 rounded-md bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                    >Mevcut</span
                                                >
                                            }
                                        </div>
                                        @if (plan.description) {
                                            <p class="mt-2 mb-0 text-sm text-color break-words">{{ plan.description }}</p>
                                        }
                                        @if (planLimitLabels(plan.code); as limits) {
                                            <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <div class="rounded-lg bg-surface-100 dark:bg-surface-800 px-2.5 py-2">
                                                    <div class="text-[10px] font-medium uppercase tracking-wide text-muted-color">Kullanıcı</div>
                                                    <div class="text-xs font-semibold text-color">{{ limits.userLimitLabel }}</div>
                                                </div>
                                                <div class="rounded-lg bg-surface-100 dark:bg-surface-800 px-2.5 py-2">
                                                    <div class="text-[10px] font-medium uppercase tracking-wide text-muted-color">Klinik</div>
                                                    <div class="text-xs font-semibold text-color">{{ limits.clinicLimitLabel }}</div>
                                                </div>
                                            </div>
                                        }
                                        @if (canManageSubscriptionOperations(s) && !isCurrentPlan(plan, s)) {
                                            <div class="mt-3">
                                                <p-button
                                                    type="button"
                                                    [label]="planActionLabel(plan)"
                                                    icon="pi pi-arrow-right"
                                                    [loading]="planActionLoadingCode() === plan.code || schedulingDowngradeCode() === plan.code"
                                                    [disabled]="planActionLoadingCode() !== null || schedulingDowngradeCode() !== null || finalizing() || postCheckoutSyncing()"
                                                    (onClick)="onPlanAction(plan)"
                                                />
                                            </div>
                                        }
                                    </div>
                                }
                            </div>
                        }
                        @if (planActionError()) {
                            <p class="text-red-500 mt-3 mb-0 text-sm" role="alert">{{ planActionError() }}</p>
                        }
                        @if (planActionInfo()) {
                            <p class="text-primary mt-3 mb-0 text-sm">{{ planActionInfo() }}</p>
                        }
                    </div>
                </div>

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
                                    <div>{{ formatDate(pendingPlanChangeEffectiveDate(pending, s)) }}</div>
                                </div>
                                @if (!isTrialingSubscription(s)) {
                                    <div>
                                        <div class="text-muted-color mb-1">Sonraki yenileme</div>
                                        <div>{{ formatDate(s.nextBillingAtUtc || s.currentPeriodEndUtc) }}</div>
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
                            @if (canManageSubscriptionOperations(s)) {
                                <div class="flex items-center gap-2">
                                    <p-button
                                        type="button"
                                        [label]="pendingPlanChangeCancelLabel(s)"
                                        icon="pi pi-times"
                                        severity="secondary"
                                        [loading]="pendingCancelLoading()"
                                        [disabled]="pendingCancelLoading() || planActionLoadingCode() !== null || finalizing() || postCheckoutSyncing()"
                                        (onClick)="cancelPendingPlanChange()"
                                    />
                                </div>
                                @if (pendingCancelError()) {
                                    <p class="text-red-500 mt-3 mb-0 text-sm">{{ pendingCancelError() }}</p>
                                }
                            }
                        </div>
                    </div>
                }

                @if (showSubscriptionCheckoutCard()) {
                    <div class="col-span-12">
                        <div class="card mb-0">
                            <h5 class="mt-0 mb-3">Ödeme durumu</h5>
                            @if (checkoutLoading()) {
                                <app-loading-state message="Ödeme durumu yükleniyor…" />
                            } @else if (checkoutError()) {
                                <app-error-state [detail]="checkoutError()!" (retry)="retryCheckout()" />
                            } @else if (checkoutSession(); as session) {
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                                    <div>
                                        <div class="text-muted-color mb-1">Hedef paket</div>
                                        <div class="font-medium">{{ checkoutTargetPlanLabel(session, s) }}</div>
                                    </div>
                                    <div>
                                        <div class="text-muted-color mb-1">Durum</div>
                                        <app-status-tag [label]="checkoutStatusLabel(session)" [severity]="checkoutStatusSeverity(session)" />
                                    </div>
                                    <div>
                                        <div class="text-muted-color mb-1">Süre sonu</div>
                                        <div>{{ formatDateTime(session.expiresAtUtc) }}</div>
                                    </div>
                                    <div class="md:col-span-2">
                                        <div class="text-muted-color mb-1">Ödeme</div>
                                        @if (session.checkoutUrl) {
                                            <p class="m-0 text-sm text-color">
                                                Güvenli ödeme sayfasına yönlendirileceksiniz. Ödeme tamamlandığında bu sayfaya döneceksiniz.
                                            </p>
                                        } @else {
                                            <span class="text-muted-color text-sm"
                                                >Ödeme bağlantısı henüz hazır değil. Durumu yenileyerek tekrar deneyin.</span
                                            >
                                        }
                                    </div>
                                    @if (session.proratedChargeMinor !== null || session.prorationRatio !== null) {
                                        <div class="md:col-span-2 p-3 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                                            <p class="m-0 text-sm text-color">
                                                Kalan dönem için hesaplanan fark:
                                                <span class="font-medium">{{
                                                    formatMinorMoney(session.proratedChargeMinor, session.chargeCurrencyCode)
                                                }}</span>
                                                @if (session.prorationRatio !== null) {
                                                    <span> (oran: {{ prorationPercentText(session.prorationRatio) }})</span>
                                                }
                                            </p>
                                            <p class="m-0 mt-1 text-xs text-muted-color">Bir sonraki yenileme tarihi değişmez.</p>
                                        </div>
                                    }
                                </div>
                                @if (finalizeError()) {
                                    <p class="text-red-500 mt-0 mb-3 text-sm" role="alert">{{ finalizeError() }}</p>
                                }
                                <div class="flex flex-wrap gap-2">
                                    @if (session.checkoutUrl) {
                                        <p-button
                                            type="button"
                                            [label]="checkoutPaymentButtonLabel()"
                                            icon="pi pi-external-link"
                                            (onClick)="goToHostedCheckout(session.checkoutUrl)"
                                            [disabled]="planActionLoadingCode() !== null || schedulingDowngradeCode() !== null || finalizing() || postCheckoutSyncing()"
                                        />
                                    }
                                    <p-button
                                        type="button"
                                        label="Durumu yenile"
                                        icon="pi pi-refresh"
                                        severity="secondary"
                                        [loading]="checkoutLoading()"
                                        [disabled]="planActionLoadingCode() !== null || schedulingDowngradeCode() !== null || finalizing() || postCheckoutSyncing()"
                                        (onClick)="refreshCheckout()"
                                    />
                                    @if (shouldOfferManualCheckoutFinalize(session)) {
                                        <p-button
                                            type="button"
                                            label="Ödemeyi tamamla"
                                            icon="pi pi-check"
                                            severity="secondary"
                                            [loading]="finalizing()"
                                            [disabled]="!session.canContinue || finalizing() || planActionLoadingCode() !== null || schedulingDowngradeCode() !== null || postCheckoutSyncing()"
                                            (onClick)="finalizeCheckout()"
                                        />
                                    }
                                </div>
                                @if (!session.canContinue) {
                                    <p class="text-sm text-muted-color mt-3 mb-0">
                                        Bu ödeme işlemi artık devam ettirilemiyor. Plan değişikliğini yeniden başlatabilirsiniz.
                                    </p>
                                }
                            } @else {
                                <p class="text-sm text-muted-color m-0">Henüz başlatılmış bir ödeme işlemi bulunmuyor.</p>
                            }
                        </div>
                    </div>
                }

                @if (canManageSubscriptionOperations(s)) {
                    <div class="col-span-12">
                        <div class="card mb-0">
                            <h5 class="mt-0 mb-3">Bilgi</h5>
                            <ul class="m-0 pl-4 text-sm text-muted-color flex flex-col gap-1">
                                @if (isTrialingSubscription(s)) {
                                    <li>Deneme süreniz boyunca plan değişiklikleri ödeme gerektirmez.</li>
                                    <li>Seçtiğiniz paket deneme süreniz bittiğinde geçerli olur.</li>
                                } @else {
                                    <li>Ödeme işlemleri güvenli ödeme altyapısı üzerinden tamamlanır.</li>
                                    <li>Plan değişiklikleri ödeme tamamlandıktan sonra otomatik olarak aboneliğinize yansıtılır.</li>
                                    <li>Paket düşürme işlemleri mevcut fatura dönemi sonunda uygulanır.</li>
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
export class SubscriptionPageComponent implements OnInit, OnDestroy {
    private readonly subscriptions = inject(SubscriptionsService);
    private readonly tenantReadOnlyContext = inject(TenantReadOnlyContextService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly messageService = inject(MessageService);
    private readonly auth = inject(AuthService);

    private pollTimeoutId: ReturnType<typeof setTimeout> | null = null;

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly summary = signal<SubscriptionSummaryVm | null>(null);
    readonly checkoutSession = signal<SubscriptionCheckoutSessionVm | null>(null);
    readonly checkoutLoading = signal(false);
    readonly checkoutError = signal<string | null>(null);
    readonly planActionLoadingCode = signal<string | null>(null);
    readonly schedulingDowngradeCode = signal<string | null>(null);
    readonly finalizing = signal(false);
    readonly finalizeError = signal<string | null>(null);
    readonly planActionError = signal<string | null>(null);
    readonly planActionInfo = signal<string | null>(null);
    readonly pendingCancelLoading = signal(false);
    readonly pendingCancelError = signal<string | null>(null);
    readonly returnBanner = signal<ReturnBannerVm | null>(null);
    readonly postCheckoutSyncing = signal(false);
    /** Uyarı banner’ındaki “Durumu yenile” — tam sayfa loading olmadan özet + checkout yeniler. */
    readonly subscriptionRefreshLoading = signal(false);

    readonly subscriptionHeaderDescription = computed(
        () => 'Kurum abonelik özetinizi, mevcut paketinizi ve plan değişikliği işlemlerinizi görüntüleyin.'
    );

    /** Hosted checkout / plan aksiyonu kromu — yalnızca yönetim yetkisi olan kullanıcıya gösterilir. */
    readonly showManageFlowChrome = computed(() => {
        const s = this.summary();
        return !!s && this.canManageSubscriptionOperations(s);
    });

    /** Checkout kartı: dönem sonu düşürme beklerken boş “oturum yok” göstermemek için gizlenir (ödeme yok). */
    readonly showSubscriptionCheckoutCard = computed(() => {
        const s = this.summary();
        if (!s || !this.canManageSubscriptionOperations(s)) {
            return false;
        }
        if (this.checkoutLoading() || this.checkoutError() != null || this.checkoutSession() != null) {
            return true;
        }
        if (s.pendingPlanChange?.changeType === 'downgrade') {
            return false;
        }
        return true;
    });

    /**
     * Özet `canManageSubscription` + JWT `Subscriptions.Manage` — paket değişimi, checkout, bekleyen plan iptali.
     */
    canManageSubscriptionOperations(s: SubscriptionSummaryVm): boolean {
        return !!s.canManageSubscription && this.auth.hasOperationClaim(SUBSCRIPTIONS_MANAGE_CLAIM);
    }

    /** Ödeme dönüşü sonrası anlık faz: processing öncelikli, sonra banner şiddeti. */
    readonly postCheckoutPhase = computed<PostCheckoutPhase>(() => {
        if (this.postCheckoutSyncing()) {
            return 'processing';
        }
        const b = this.returnBanner();
        if (!b) {
            return 'idle';
        }
        if (b.severity === 'success') {
            return 'success';
        }
        if (b.severity === 'error') {
            return 'error';
        }
        return 'warning';
    });

    readonly formatDate = (v: string | null | undefined) => formatDateDisplay(v);
    readonly formatDateTime = (v: string | null | undefined) => formatDateTimeDisplay(v);
    readonly shouldOfferManualCheckoutFinalize = shouldOfferManualCheckoutFinalize;
    readonly subscriptionPlanLabel = subscriptionPlanLabel;
    readonly planLimitLabels = subscriptionPlanLimitLabels;

    ngOnInit(): void {
        const params = this.route.snapshot.queryParamMap;
        const storedId = readStoredCheckoutSessionId();
        const expectingHostedReturn = consumeExpectingHostedCheckoutReturn();
        const returnQueryPresent = hasSubscriptionCheckoutReturnQuery(params);
        const parsedReturn = parseSubscriptionCheckoutReturn(params, storedId);

        /** Query (iyzico token vb.) veya hosted’a gidip dönüş: oturum id sessionStorage’da. */
        const hostedCheckoutEntry = returnQueryPresent || (expectingHostedReturn && !!storedId);

        if (returnQueryPresent) {
            void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
        }

        const sessionForSync = (parsedReturn.sessionId?.trim() || storedId?.trim()) ?? '';
        const shouldStartProcessingEarly =
            hostedCheckoutEntry && parsedReturn.outcome === 'success' && !!sessionForSync;

        if (shouldStartProcessingEarly) {
            this.postCheckoutSyncing.set(true);
        }

        this.reload(
            () => {
                if (hostedCheckoutEntry) {
                    this.handleCheckoutReturn(parsedReturn);
                }
            },
            { bustSummaryCache: hostedCheckoutEntry }
        );
    }

    ngOnDestroy(): void {
        this.clearPollTimeout();
    }

    reload(onComplete?: () => void, options?: { readonly bustSummaryCache?: boolean }): void {
        this.loading.set(true);
        this.error.set(null);
        const bust = !!options?.bustSummaryCache;
        forkJoin([
            this.subscriptions.getSubscriptionSummary({ bustCache: bust }),
            this.pendingPlanChangeObservable({ bustCache: bust })
        ]).subscribe({
            next: ([data, pending]) => {
                const merged = { ...data, pendingPlanChange: pending };
                this.summary.set(merged);
                this.tenantReadOnlyContext.applySummary(merged);
                this.finalizeError.set(null);
                this.planActionError.set(null);
                this.pendingCancelError.set(null);
                this.loading.set(false);
                onComplete?.();
            },
            error: (e: unknown) => {
                this.summary.set(null);
                this.error.set(e instanceof Error ? e.message : 'Abonelik özeti alınamadı.');
                this.loading.set(false);
                onComplete?.();
            }
        });
    }

    /**
     * Tam sayfa loading açmadan abonelik özetini ve (varsa) checkout oturumunu yeniler.
     * Uyarı / zaman aşımı banner’larındaki “Durumu yenile” için.
     */
    refreshSubscriptionSnapshot(): void {
        this.subscriptionRefreshLoading.set(true);
        this.planActionError.set(null);
        const sessionId = this.checkoutSession()?.checkoutSessionId?.trim() ?? readStoredCheckoutSessionId()?.trim() ?? null;

        const done = (e: unknown) => {
            this.subscriptionRefreshLoading.set(false);
            this.planActionError.set(e instanceof Error ? e.message : 'Durum yenilenemedi.');
        };

        if (sessionId) {
            forkJoin([
                this.subscriptions.getSubscriptionSummary({ bustCache: true }),
                this.pendingPlanChangeObservable({ bustCache: true }),
                this.subscriptions.getCheckout(sessionId)
            ]).subscribe({
                next: ([data, pending, session]) => {
                    const merged = this.mergeSummaryWithPending(data, pending);
                    this.summary.set(merged);
                    this.tenantReadOnlyContext.applySummary(merged);
                    this.checkoutSession.set(session);
                    this.subscriptionRefreshLoading.set(false);
                },
                error: done
            });
        } else {
            forkJoin([
                this.subscriptions.getSubscriptionSummary({ bustCache: true }),
                this.pendingPlanChangeObservable({ bustCache: true })
            ]).subscribe({
                next: ([data, pending]) => {
                    const merged = this.mergeSummaryWithPending(data, pending);
                    this.summary.set(merged);
                    this.tenantReadOnlyContext.applySummary(merged);
                    this.subscriptionRefreshLoading.set(false);
                },
                error: done
            });
        }
    }

    statusLabel(summary: SubscriptionSummaryVm): string {
        return subscriptionStatusLabel(summary.status);
    }

    statusSeverity(summary: SubscriptionSummaryVm) {
        return subscriptionStatusSeverity(summary.status);
    }

    currentPlanLabel(summary: SubscriptionSummaryVm): string {
        return subscriptionPlanLabel(summary.planCode, summary.planName);
    }

    planLabel(plan: { code: string; name: string }): string {
        return subscriptionPlanLabel(plan.code, plan.name);
    }

    isCurrentPlan(plan: SubscriptionPlanVm, summary: SubscriptionSummaryVm): boolean {
        const current = summary.planCode?.trim().toLowerCase();
        const candidate = plan.code.trim().toLowerCase();
        return !!current && current === candidate;
    }

    hasOpenSessionForPlan(plan: SubscriptionPlanVm): boolean {
        const session = this.checkoutSession();
        if (!session?.targetPlanCode || !session.canContinue) {
            return false;
        }
        return session.targetPlanCode.trim().toLowerCase() === plan.code.trim().toLowerCase();
    }

    planActionLabel(plan: SubscriptionPlanVm): string {
        if (!this.hasOpenSessionForPlan(plan)) {
            const summary = this.summary();
            if (!summary) {
                return 'Bu paketi aktifleştir';
            }
            if (this.isDowngradePlan(plan, summary)) {
                return this.isTrialingSubscription(summary) ? 'Deneme bitiminde bu pakete geç' : 'Dönem sonunda bu pakete geç';
            }
            if (this.isUpgradePlan(plan, summary)) {
                return 'Hemen yükselt';
            }
            return 'Bu paketi aktifleştir';
        }
        const url = this.checkoutSession()?.checkoutUrl?.trim();
        return url ? 'Ödemeye devam et' : 'Durumu yenile';
    }

    onPlanAction(plan: SubscriptionPlanVm): void {
        const summary = this.summary();
        if (!summary) {
            return;
        }
        if (!this.canManageSubscriptionOperations(summary)) {
            return;
        }
        this.planActionError.set(null);
        this.planActionInfo.set(null);
        if (this.hasOpenSessionForPlan(plan)) {
            const url = this.checkoutSession()?.checkoutUrl?.trim();
            if (url) {
                this.goToHostedCheckout(url);
                return;
            }
            this.refreshCheckout();
            return;
        }
        if (this.isDowngradePlan(plan, summary)) {
            this.scheduleDowngrade(plan.code);
            return;
        }
        this.startCheckout(plan.code);
    }

    checkoutPaymentButtonLabel(): string {
        return 'Ödemeye devam et';
    }

    goToHostedCheckout(checkoutUrl: string): void {
        const id = this.checkoutSession()?.checkoutSessionId?.trim();
        if (id) {
            writeStoredCheckoutSessionId(id);
            markExpectingHostedCheckoutReturn();
        }
        window.location.assign(checkoutUrl.trim());
    }

    retryCheckout(): void {
        if (this.checkoutSession()?.checkoutSessionId) {
            this.refreshCheckout();
        }
    }

    refreshCheckout(): void {
        const sessionId = this.checkoutSession()?.checkoutSessionId;
        if (!sessionId) {
            return;
        }
        this.checkoutLoading.set(true);
        this.checkoutError.set(null);
        this.subscriptions.getCheckout(sessionId).subscribe({
            next: (session) => {
                this.checkoutSession.set(session);
                this.checkoutLoading.set(false);
            },
            error: (e: unknown) => {
                this.checkoutError.set(e instanceof Error ? e.message : 'Ödeme durumu yüklenemedi.');
                this.checkoutLoading.set(false);
            }
        });
    }

    finalizeCheckout(): void {
        const sessionId = this.checkoutSession()?.checkoutSessionId;
        if (!sessionId) {
            return;
        }
        const s = this.summary();
        if (!s || !this.canManageSubscriptionOperations(s)) {
            return;
        }
        this.finalizing.set(true);
        this.finalizeError.set(null);
        this.subscriptions.finalizeCheckout(sessionId).subscribe({
            next: (session) => {
                this.checkoutSession.set(session);
                this.finalizing.set(false);
                clearStoredCheckoutSessionId();
                this.reload();
            },
            error: (e: unknown) => {
                this.finalizing.set(false);
                this.finalizeError.set(e instanceof Error ? e.message : 'Aktivasyon tamamlanamadı.');
            }
        });
    }

    checkoutStatusLabel(session: SubscriptionCheckoutSessionVm): string {
        return subscriptionCheckoutStatusLabel(session.status);
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

    private startCheckout(targetPlanCode: string): void {
        const sum = this.summary();
        if (!sum || !this.canManageSubscriptionOperations(sum)) {
            return;
        }
        this.planActionLoadingCode.set(targetPlanCode);
        this.checkoutLoading.set(true);
        this.checkoutError.set(null);
        this.finalizeError.set(null);
        this.planActionError.set(null);
        this.planActionInfo.set(null);
        this.subscriptions.startCheckout(targetPlanCode).subscribe({
            next: (session) => {
                this.checkoutSession.set(session);
                if (session.checkoutUrl?.trim()) {
                    writeStoredCheckoutSessionId(session.checkoutSessionId);
                }
                this.planActionLoadingCode.set(null);
                this.checkoutLoading.set(false);
            },
            error: (e: unknown) => {
                this.planActionLoadingCode.set(null);
                this.checkoutLoading.set(false);
                this.checkoutError.set(e instanceof Error ? e.message : 'Ödeme işlemi başlatılamadı.');
            }
        });
    }

    daysRemainingText(days: number | null): string {
        if (days === null) {
            return '—';
        }
        return `${days} gün`;
    }

    /** API `daysRemaining`; deneme dışında etiket genel tutulur (backend alanı semantiği). */
    remainingDaysRowLabel(s: SubscriptionSummaryVm): string {
        return this.isTrialingSubscription(s) ? 'Kalan deneme süresi' : 'Kalan gün';
    }

    periodStartLabel(s: SubscriptionSummaryVm): string {
        return this.isTrialingSubscription(s) ? 'Deneme başlangıcı' : 'Dönem başlangıcı';
    }

    periodEndLabel(s: SubscriptionSummaryVm): string {
        return this.isTrialingSubscription(s) ? 'Deneme bitişi' : 'Dönem sonu';
    }

    periodStartDate(s: SubscriptionSummaryVm): string | null | undefined {
        return this.isTrialingSubscription(s) ? s.trialStartsAtUtc || s.currentPeriodStartUtc : s.currentPeriodStartUtc || s.trialStartsAtUtc;
    }

    periodEndDate(s: SubscriptionSummaryVm): string | null | undefined {
        return this.isTrialingSubscription(s) ? s.trialEndsAtUtc || s.currentPeriodEndUtc : s.currentPeriodEndUtc || s.trialEndsAtUtc;
    }

    pendingPlanChangeEffectiveDateLabel(s: SubscriptionSummaryVm): string {
        return this.isTrialingSubscription(s) ? 'Deneme bitişi' : 'Uygulanma tarihi';
    }

    pendingPlanChangeEffectiveDate(pending: PendingPlanChangeVm, s: SubscriptionSummaryVm): string | null | undefined {
        if (this.isTrialingSubscription(s)) {
            return pending.effectiveAtUtc || s.trialEndsAtUtc || s.currentPeriodEndUtc;
        }
        return pending.effectiveAtUtc || s.currentPeriodEndUtc || s.nextBillingAtUtc;
    }

    tenantAccessModeLabel(isReadOnly: boolean): string {
        return isReadOnly ? 'Salt okunur' : 'Aktif';
    }

    boolText(value: boolean): string {
        return value ? 'Evet' : 'Hayır';
    }

    subscriptionManageFlowHint(): string {
        return 'Paket yükseltmeleri güvenli ödeme adımıyla tamamlanır. Paket düşürme işlemleri mevcut fatura dönemi sonunda uygulanır.';
    }

    isTrialingSubscription(summary: SubscriptionSummaryVm): boolean {
        return summary.status === 'trialing';
    }

    pendingPlanChangeCancelLabel(summary: SubscriptionSummaryVm): string {
        return this.isTrialingSubscription(summary) ? 'Plan değişikliğini iptal et' : 'Bekleyen geçişi iptal et';
    }

    scheduledPlanChangeSuccessMessage(summary: SubscriptionSummaryVm): string {
        return this.isTrialingSubscription(summary)
            ? 'Plan değişikliği deneme bitimine planlandı.'
            : 'Paket düşürme dönem sonuna planlandı.';
    }

    pendingPlanChangeTypeLabel(type: PendingPlanChangeTypeKey, summary: SubscriptionSummaryVm): string {
        if (type === 'downgrade') {
            return this.isTrialingSubscription(summary) ? 'Deneme bitiminde plan değişikliği' : 'Dönem sonunda paket düşürme';
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

    cancelPendingPlanChange(): void {
        const s = this.summary();
        if (!s || !this.canManageSubscriptionOperations(s)) {
            return;
        }
        this.pendingCancelLoading.set(true);
        this.pendingCancelError.set(null);
        this.planActionInfo.set(null);
        this.subscriptions.cancelPendingPlanChange().subscribe({
            next: () => {
                this.pendingCancelLoading.set(false);
                this.reload(() => this.planActionInfo.set('Bekleyen plan değişikliği iptal edildi.'));
            },
            error: (e: unknown) => {
                this.pendingCancelLoading.set(false);
                this.pendingCancelError.set(e instanceof Error ? e.message : 'Bekleyen plan değişikliği iptal edilemedi.');
            }
        });
    }

    private isUpgradePlan(plan: SubscriptionPlanVm, summary: SubscriptionSummaryVm): boolean {
        const currentIdx = subscriptionPlanRank(summary.planCode);
        const nextIdx = subscriptionPlanRank(plan.code);
        if (currentIdx === null || nextIdx === null) {
            return false;
        }
        return nextIdx > currentIdx;
    }

    private isDowngradePlan(plan: SubscriptionPlanVm, summary: SubscriptionSummaryVm): boolean {
        const currentIdx = subscriptionPlanRank(summary.planCode);
        const nextIdx = subscriptionPlanRank(plan.code);
        if (currentIdx === null || nextIdx === null) {
            return false;
        }
        return nextIdx < currentIdx;
    }

    private scheduleDowngrade(targetPlanCode: string): void {
        const sum = this.summary();
        if (!sum || !this.canManageSubscriptionOperations(sum)) {
            return;
        }
        this.schedulingDowngradeCode.set(targetPlanCode);
        this.planActionError.set(null);
        this.planActionInfo.set(null);
        this.subscriptions.scheduleDowngrade(targetPlanCode).subscribe({
            next: () => {
                this.schedulingDowngradeCode.set(null);
                this.checkoutSession.set(null);
                this.reload(() => this.planActionInfo.set(this.scheduledPlanChangeSuccessMessage(sum)));
            },
            error: (e: unknown) => {
                this.schedulingDowngradeCode.set(null);
                this.planActionError.set(e instanceof Error ? e.message : 'Paket düşürme planlanamadı.');
            }
        });
    }

    private handleCheckoutReturn(parsed: ParsedSubscriptionCheckoutReturn): void {
        this.returnBanner.set(null);

        if (parsed.outcome === 'cancel') {
            this.returnBanner.set({
                severity: 'warn',
                title: 'Ödeme sayfasından ayrıldınız veya işlemi iptal ettiniz.',
                detail: 'Aynı ödeme işlemine devam edebilir veya plan değişikliğini yeniden başlatabilirsiniz.'
            });
            const sessionId = parsed.sessionId ?? readStoredCheckoutSessionId();
            if (sessionId) {
                this.hydrateCheckoutSession(sessionId);
            }
            return;
        }

        if (parsed.outcome === 'success') {
            const sessionId = parsed.sessionId ?? readStoredCheckoutSessionId();
            if (!sessionId) {
                this.returnBanner.set({
                    severity: 'warn',
                    title: 'Ödeme dönüşü algılandı ancak işlem bilgisi bulunamadı.',
                    detail: 'Plan değişikliğini bu sayfadan yeniden başlatabilirsiniz.',
                    showRefreshCta: true
                });
                return;
            }
            this.returnBanner.set(null);
            this.postCheckoutSyncing.set(true);
            this.runPostCheckoutSyncRound(sessionId, 0);
        }
    }

    private hydrateCheckoutSession(sessionId: string): void {
        this.checkoutLoading.set(true);
        this.checkoutError.set(null);
        this.subscriptions.getCheckout(sessionId).subscribe({
            next: (session) => {
                this.checkoutSession.set(session);
                this.checkoutLoading.set(false);
            },
            error: (e: unknown) => {
                this.checkoutError.set(e instanceof Error ? e.message : 'Ödeme durumu yüklenemedi.');
                this.checkoutLoading.set(false);
            }
        });
    }

    private clearPollTimeout(): void {
        if (this.pollTimeoutId !== null) {
            clearTimeout(this.pollTimeoutId);
            this.pollTimeoutId = null;
        }
    }

    private runPostCheckoutSyncRound(sessionId: string, attempt: number): void {
        this.clearPollTimeout();
        const maxAttempts = 45;

        if (attempt >= maxAttempts) {
            this.finishPostCheckoutPollingTimeout(sessionId);
            return;
        }

        forkJoin([
            this.subscriptions.getCheckout(sessionId),
            this.subscriptions.getSubscriptionSummary({ bustCache: true }),
            this.pendingPlanChangeObservable({ bustCache: true })
        ]).subscribe({
            next: ([session, data, pending]) => {
                const summary = this.mergeSummaryWithPending(data, pending);
                this.checkoutSession.set(session);
                this.summary.set(summary);
                this.tenantReadOnlyContext.applySummary(summary);

                const planMatchesTarget = this.planCodeMatchesTarget(summary.planCode, session.targetPlanCode);

                const terminalFailed =
                    session.status === 'failed' || session.status === 'cancelled' || session.status === 'expired';

                if (terminalFailed) {
                    this.postCheckoutSyncing.set(false);
                    if (session.status === 'cancelled') {
                        this.returnBanner.set({
                            severity: 'secondary',
                            title: 'Ödeme işlemi iptal edilmiş veya sonlandırılmış görünüyor.',
                            showRefreshCta: true
                        });
                    } else {
                        this.returnBanner.set({
                            severity: 'error',
                            title: 'Ödeme tamamlanamadı.',
                            detail: 'Gerekirse plan değişikliğini yeniden başlatabilirsiniz.',
                            showRefreshCta: true
                        });
                    }
                    return;
                }

                /** Başarı yalnızca subscription-summary ile: hedef plan kodu eşleşti ve erişim salt okunur değil. Checkout finalized tek başına yetmez. */
                if (planMatchesTarget && !summary.isReadOnly) {
                    this.completePostCheckoutUpgrade(sessionId);
                    return;
                }

                this.pollTimeoutId = setTimeout(() => this.runPostCheckoutSyncRound(sessionId, attempt + 1), 2000);
            },
            error: () => {
                this.pollTimeoutId = setTimeout(() => this.runPostCheckoutSyncRound(sessionId, attempt + 1), 2500);
            }
        });
    }

    /** Son tur: özet hâlâ hedef planı göstermiyorsa veya erişim kilitliyse anlamlı uyarı. */
    private finishPostCheckoutPollingTimeout(sessionId: string): void {
        forkJoin([
            this.subscriptions.getCheckout(sessionId),
            this.subscriptions.getSubscriptionSummary({ bustCache: true }),
            this.pendingPlanChangeObservable({ bustCache: true })
        ]).subscribe({
            next: ([session, data, pending]) => {
                const summary = this.mergeSummaryWithPending(data, pending);
                this.summary.set(summary);
                this.tenantReadOnlyContext.applySummary(summary);

                const planMatchesTarget = this.planCodeMatchesTarget(summary.planCode, session.targetPlanCode);
                this.postCheckoutSyncing.set(false);

                if (planMatchesTarget && !summary.isReadOnly) {
                    clearStoredCheckoutSessionId();
                    this.checkoutSession.set(null);
                    this.returnBanner.set({
                        severity: 'warn',
                        title: 'Ödeme doğrulaması zaman aşımına uğradı.',
                        detail: 'Abonelik özetiniz güncellenmiş görünüyor; emin değilseniz durumu yenileyin.',
                        showRefreshCta: true
                    });
                    return;
                }

                this.checkoutSession.set(session);

                if (planMatchesTarget && summary.isReadOnly) {
                    this.returnBanner.set({
                        severity: 'warn',
                        title: 'Paket bilgisi güncellendi; tam erişim birkaç saniye içinde açılabilir.',
                        detail: '“Durumu yenile” ile kontrol edin veya kısa süre sonra tekrar deneyin.',
                        showRefreshCta: true
                    });
                    return;
                }

                if (!planMatchesTarget) {
                    this.returnBanner.set({
                        severity: 'warn',
                        title: 'Ödeme tamamlandı ancak paket değişikliği henüz yansımadı.',
                        detail: 'Durumu yeniden kontrol edin.',
                        showRefreshCta: true
                    });
                }
            },
            error: () => {
                this.postCheckoutSyncing.set(false);
                this.returnBanner.set({
                    severity: 'warn',
                    title: 'Abonelik durumu doğrulanamadı.',
                    detail: 'Bağlantınızı kontrol edip durumu yenileyin.',
                    showRefreshCta: true
                });
            }
        });
    }

    private pendingPlanChangeObservable(
        options?: SubscriptionSummaryRequestOptions
    ): Observable<PendingPlanChangeVm | null> {
        return this.auth.hasOperationClaim(SUBSCRIPTIONS_MANAGE_CLAIM)
            ? this.subscriptions.getPendingPlanChange(options)
            : of(null);
    }

    private mergeSummaryWithPending(data: SubscriptionSummaryVm, pending: PendingPlanChangeVm | null): SubscriptionSummaryVm {
        return { ...data, pendingPlanChange: pending };
    }

    private planCodeMatchesTarget(planCode: string | null, targetPlanCode: string | null): boolean {
        const t = targetPlanCode?.trim().toLowerCase() ?? '';
        const c = planCode?.trim().toLowerCase() ?? '';
        if (!t || !c) {
            return false;
        }
        return c === t;
    }

    /** Ödeme + webhook sonrası yükseltme tamam: özet güncel, read-only context güncellendi, checkout oturumu temizlendi. */
    private completePostCheckoutUpgrade(checkoutSessionId: string): void {
        this.postCheckoutSyncing.set(false);
        clearStoredCheckoutSessionId();
        this.checkoutSession.set(null);
        this.returnBanner.set({
            severity: 'success',
            title: 'Üyeliğiniz başarıyla güncellendi.',
            detail: 'Yeni paketiniz artık aktif.'
        });
        if (!hasUpgradeSuccessAck(checkoutSessionId)) {
            markUpgradeSuccessAck(checkoutSessionId);
            addTracedToast(this.messageService, 'SubscriptionPage', this.router.url, {
                severity: 'success',
                summary: 'Üyeliğiniz başarıyla güncellendi.',
                detail: 'Yeni paketiniz artık aktif.',
                life: 8000
            });
        }
    }
}
