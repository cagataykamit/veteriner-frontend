import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { forkJoin, Observable, of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { SUBSCRIPTIONS_MANAGE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { PendingPlanChangeVm, SubscriptionBillingPeriod, SubscriptionCheckoutSessionVm, SubscriptionPlanVm, SubscriptionSummaryVm } from '@/app/entities/subscription/models/subscription-vm.model';
import type { SubscriptionSummaryRequestOptions } from '@/app/entities/subscription/services/subscriptions.service';
import { SubscriptionsService } from '@/app/entities/subscription/services/subscriptions.service';
import { isActiveTrialingSubscription, isExpiredReadOnlySubscription } from '@/app/features/subscriptions/utils/subscription-access.utils';
import { canChooseBillingPeriod } from '@/app/features/subscriptions/utils/subscription-billing-period.utils';
import { hasSubscriptionCheckoutReturnQuery, parseSubscriptionCheckoutReturn, type ParsedSubscriptionCheckoutReturn } from '@/app/features/subscriptions/utils/subscription-checkout-return.utils';
import {
    clearStoredCheckoutSessionId,
    consumeExpectingHostedCheckoutReturn,
    hasUpgradeSuccessAck,
    markExpectingHostedCheckoutReturn,
    markUpgradeSuccessAck,
    readStoredCheckoutSessionId,
    writeStoredCheckoutSessionId
} from '@/app/features/subscriptions/utils/subscription-checkout-storage.utils';
import { hasOpenCheckoutForPlan, isDowngradePlan } from '@/app/features/subscriptions/utils/subscription-plan-change.utils';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';

type ReturnBannerSeverity = 'info' | 'success' | 'warn' | 'secondary' | 'error';

/** Ödeme dönüşü sonrası üst düzey UX fazı (banner + processing ile uyumlu). */
type PostCheckoutPhase = 'idle' | 'processing' | 'success' | 'warning' | 'error';

export interface ReturnBannerVm {
    readonly severity: ReturnBannerSeverity;
    readonly title: string;
    readonly detail?: string;
    /** Özet + varsa checkout’u yeniden çek (sayfa yenilemeden). */
    readonly showRefreshCta?: boolean;
}

/**
 * Abonelik sayfasının durumu ve ödeme akışı: özet yükleme, plan eylemi, hosted checkout, dönüş sonrası doğrulama turları.
 * Sayfa bileşeninde sağlanır (`providers`); sayfa kapanınca bekleyen tur iptal edilir.
 */
@Injectable()
export class CheckoutFlowService {
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
    /** Plan kartları ve yenileme ödemesi için seçilen dönem (BILL-001); özet yüklenince mevcut döneme döner. */
    readonly selectedBillingPeriod = signal<SubscriptionBillingPeriod>('Monthly');

    /** Plan değişikliği, ödeme veya doğrulama sürüyor: plan ve ödeme düğmeleri kapalı. */
    readonly planActionsBusy = computed(() => this.planActionLoadingCode() !== null || this.schedulingDowngradeCode() !== null || this.finalizing() || this.postCheckoutSyncing());

    /** Hosted checkout / plan aksiyonu kromu — yalnızca yönetim yetkisi olan kullanıcıya gösterilir. */
    readonly showManageFlowChrome = computed(() => {
        const s = this.summary();

        return !!s && this.canManageSubscriptionOperations(s);
    });

    /** Checkout kartı: dönem sonu düşürme beklerken boş “oturum yok” göstermemek için gizlenir (ödeme yok). Salt okunur/yenileme gerekli durumda her zaman gösterilir. */
    readonly showSubscriptionCheckoutCard = computed(() => {
        const s = this.summary();

        if (!s || !this.canManageSubscriptionOperations(s)) {
            return false;
        }

        if (isExpiredReadOnlySubscription(s)) {
            return true;
        }

        if (this.checkoutLoading() || this.checkoutError() != null || this.checkoutSession() != null) {
            return true;
        }

        if (s.pendingPlanChange?.changeType === 'downgrade') {
            return false;
        }

        return true;
    });

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

    constructor() {
        inject(DestroyRef).onDestroy(() => this.clearPollTimeout());
    }

    /**
     * Özet `canManageSubscription` + JWT `Subscriptions.Manage` — paket değişimi, checkout, bekleyen plan iptali.
     */
    canManageSubscriptionOperations(s: SubscriptionSummaryVm): boolean {
        return !!s.canManageSubscription && this.auth.hasOperationClaim(SUBSCRIPTIONS_MANAGE_CLAIM);
    }

    /** Sayfa açılışı: özet yüklenir; ödeme dönüşüyse (query veya hosted’dan dönüş) dönüş işlenir. */
    start(): void {
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
        const shouldStartProcessingEarly = hostedCheckoutEntry && parsedReturn.outcome === 'success' && !!sessionForSync;

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

    reload(onComplete?: () => void, options?: { readonly bustSummaryCache?: boolean }): void {
        this.loading.set(true);
        this.error.set(null);
        const bust = !!options?.bustSummaryCache;

        forkJoin([this.subscriptions.getSubscriptionSummary({ bustCache: bust }), this.pendingPlanChangeObservable({ bustCache: bust })]).subscribe({
            next: ([data, pending]) => {
                const merged = { ...data, pendingPlanChange: pending };

                this.summary.set(merged);
                this.selectedBillingPeriod.set(merged.billingPeriod);
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
            forkJoin([this.subscriptions.getSubscriptionSummary({ bustCache: true }), this.pendingPlanChangeObservable({ bustCache: true }), this.subscriptions.getCheckout(sessionId)]).subscribe({
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
            forkJoin([this.subscriptions.getSubscriptionSummary({ bustCache: true }), this.pendingPlanChangeObservable({ bustCache: true })]).subscribe({
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

        if (hasOpenCheckoutForPlan(plan, this.checkoutSession(), this.selectedBillingPeriod())) {
            const url = this.checkoutSession()?.checkoutUrl?.trim();

            if (url) {
                this.goToHostedCheckout(url);

                return;
            }

            this.refreshCheckout();

            return;
        }

        if (isExpiredReadOnlySubscription(summary)) {
            this.startCheckout(plan.code);

            return;
        }

        if (isDowngradePlan(plan, summary)) {
            this.scheduleDowngrade(plan.code);

            return;
        }

        this.startCheckout(plan.code);
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

    startPaymentForCurrentPlan(): void {
        const summary = this.summary();
        const planCode = summary?.planCode?.trim();

        if (!summary || !planCode || !this.canManageSubscriptionOperations(summary)) {
            return;
        }

        this.startCheckout(planCode);
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
        // Dönem seçilemiyorsa (deneme, etkin yıllık dönem) backend mevcut dönemi kullanır.
        const billingPeriod = canChooseBillingPeriod(sum) ? this.selectedBillingPeriod() : undefined;

        this.subscriptions.startCheckout(targetPlanCode, billingPeriod).subscribe({
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
                const message = e instanceof Error ? e.message : 'Ödeme işlemi başlatılamadı.';

                this.checkoutError.set(message);
                this.planActionError.set(message);
            }
        });
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
                this.reload(() => this.planActionInfo.set(isActiveTrialingSubscription(sum) ? 'Plan değişikliği deneme bitimine planlandı.' : 'Paket düşürme dönem sonuna planlandı.'));
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

        forkJoin([this.subscriptions.getCheckout(sessionId), this.subscriptions.getSubscriptionSummary({ bustCache: true }), this.pendingPlanChangeObservable({ bustCache: true })]).subscribe({
            next: ([session, data, pending]) => {
                const summary = this.mergeSummaryWithPending(data, pending);

                this.checkoutSession.set(session);
                this.summary.set(summary);
                this.tenantReadOnlyContext.applySummary(summary);

                const planMatchesTarget = this.planCodeMatchesTarget(summary.planCode, session.targetPlanCode);

                const terminalFailed = session.status === 'failed' || session.status === 'cancelled' || session.status === 'expired';

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
        forkJoin([this.subscriptions.getCheckout(sessionId), this.subscriptions.getSubscriptionSummary({ bustCache: true }), this.pendingPlanChangeObservable({ bustCache: true })]).subscribe({
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

    private pendingPlanChangeObservable(options?: SubscriptionSummaryRequestOptions): Observable<PendingPlanChangeVm | null> {
        return this.auth.hasOperationClaim(SUBSCRIPTIONS_MANAGE_CLAIM) ? this.subscriptions.getPendingPlanChange(options) : of(null);
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
