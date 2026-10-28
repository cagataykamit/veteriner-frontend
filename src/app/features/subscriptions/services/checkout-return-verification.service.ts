import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import type { Observable } from 'rxjs';
import type { SubscriptionCheckoutSessionVm, SubscriptionSummaryVm } from '@/app/entities/subscription/models/subscription-vm.model';
import { clearStoredCheckoutSessionId, hasUpgradeSuccessAck, markUpgradeSuccessAck } from '@/app/features/subscriptions/utils/subscription-checkout-storage.utils';
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

/** Doğrulama turlarının sayfa durumunu okuyup yazdığı uçlar; `CheckoutFlowService` sağlar. */
export interface CheckoutReturnVerificationHost {
    /** Checkout oturumu + önbelleksiz özet (bekleyen plan değişikliği birleşik). */
    fetchSnapshot(sessionId: string): Observable<readonly [SubscriptionCheckoutSessionVm, SubscriptionSummaryVm]>;
    applySummary(summary: SubscriptionSummaryVm): void;
    setCheckoutSession(session: SubscriptionCheckoutSessionVm | null): void;
}

/**
 * Hosted ödemeden başarılı dönüş sonrası doğrulama turları: özet hedef planı gösterene kadar yoklar, sonucu banner ile bildirir.
 * Sayfa bileşeninde sağlanır (`providers`); sayfa kapanınca bekleyen tur iptal edilir.
 */
@Injectable()
export class CheckoutReturnVerificationService {
    private readonly router = inject(Router);
    private readonly messageService = inject(MessageService);

    private pollTimeoutId: ReturnType<typeof setTimeout> | null = null;

    readonly returnBanner = signal<ReturnBannerVm | null>(null);
    readonly postCheckoutSyncing = signal(false);

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

    /** Doğrulamayı ilk turdan başlatır; bekleyen tur varsa iptal edilir. */
    verify(sessionId: string, host: CheckoutReturnVerificationHost): void {
        this.returnBanner.set(null);
        this.postCheckoutSyncing.set(true);
        this.runPostCheckoutSyncRound(sessionId, 0, host);
    }

    private clearPollTimeout(): void {
        if (this.pollTimeoutId !== null) {
            clearTimeout(this.pollTimeoutId);
            this.pollTimeoutId = null;
        }
    }

    private runPostCheckoutSyncRound(sessionId: string, attempt: number, host: CheckoutReturnVerificationHost): void {
        this.clearPollTimeout();
        const maxAttempts = 45;

        if (attempt >= maxAttempts) {
            this.finishPostCheckoutPollingTimeout(sessionId, host);

            return;
        }

        host.fetchSnapshot(sessionId).subscribe({
            next: ([session, summary]) => {
                host.setCheckoutSession(session);
                host.applySummary(summary);

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
                    this.completePostCheckoutUpgrade(sessionId, host);

                    return;
                }

                this.pollTimeoutId = setTimeout(() => this.runPostCheckoutSyncRound(sessionId, attempt + 1, host), 2000);
            },
            error: () => {
                this.pollTimeoutId = setTimeout(() => this.runPostCheckoutSyncRound(sessionId, attempt + 1, host), 2500);
            }
        });
    }

    /** Son tur: özet hâlâ hedef planı göstermiyorsa veya erişim kilitliyse anlamlı uyarı. */
    private finishPostCheckoutPollingTimeout(sessionId: string, host: CheckoutReturnVerificationHost): void {
        host.fetchSnapshot(sessionId).subscribe({
            next: ([session, summary]) => {
                host.applySummary(summary);

                const planMatchesTarget = this.planCodeMatchesTarget(summary.planCode, session.targetPlanCode);

                this.postCheckoutSyncing.set(false);

                if (planMatchesTarget && !summary.isReadOnly) {
                    clearStoredCheckoutSessionId();
                    host.setCheckoutSession(null);
                    this.returnBanner.set({
                        severity: 'warn',
                        title: 'Ödeme doğrulaması zaman aşımına uğradı.',
                        detail: 'Abonelik özetiniz güncellenmiş görünüyor; emin değilseniz durumu yenileyin.',
                        showRefreshCta: true
                    });

                    return;
                }

                host.setCheckoutSession(session);

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

    private planCodeMatchesTarget(planCode: string | null, targetPlanCode: string | null): boolean {
        const t = targetPlanCode?.trim().toLowerCase() ?? '';
        const c = planCode?.trim().toLowerCase() ?? '';

        if (!t || !c) {
            return false;
        }

        return c === t;
    }

    /** Ödeme + webhook sonrası yükseltme tamam: özet güncel, read-only context güncellendi, checkout oturumu temizlendi. */
    private completePostCheckoutUpgrade(checkoutSessionId: string, host: CheckoutReturnVerificationHost): void {
        this.postCheckoutSyncing.set(false);
        clearStoredCheckoutSessionId();
        host.setCheckoutSession(null);
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
