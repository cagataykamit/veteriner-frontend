import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { forkJoin } from 'rxjs';
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
import { SubscriptionsService } from '@/app/features/subscriptions/services/subscriptions.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import {
    expectsHostedCheckoutUrl,
    shouldOfferManualCheckoutFinalize,
    subscriptionCheckoutProviderDisplayLabel
} from '@/app/features/subscriptions/utils/subscription-checkout-provider.utils';
import {
    hasSubscriptionCheckoutReturnQuery,
    parseSubscriptionCheckoutReturn,
    type ParsedSubscriptionCheckoutReturn
} from '@/app/features/subscriptions/utils/subscription-checkout-return.utils';
import {
    clearStoredCheckoutSessionId,
    hasUpgradeSuccessAck,
    markUpgradeSuccessAck,
    readStoredCheckoutSessionId,
    writeStoredCheckoutSessionId
} from '@/app/features/subscriptions/utils/subscription-checkout-storage.utils';
import {
    subscriptionCheckoutStatusLabel,
    subscriptionCheckoutStatusSeverity
} from '@/app/features/subscriptions/utils/subscription-checkout-status.utils';
import { subscriptionPlanLabel } from '@/app/features/subscriptions/utils/subscription-plan.utils';
import { subscriptionStatusLabel, subscriptionStatusSeverity } from '@/app/features/subscriptions/utils/subscription-status.utils';

type ReturnBannerSeverity = 'info' | 'success' | 'warn' | 'secondary';

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
        <p-toast position="top-right" />
        <app-page-header
            title="Abonelik"
            subtitle="Paket & Deneme"
            description="Kiracı abonelik özeti ve paket aktivasyon akışı."
        />

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
                        'bg-surface-100 dark:bg-surface-800 border-surface-200 dark:border-surface-700': banner.severity === 'secondary'
                    }"
                >
                    <p class="m-0 text-sm text-color">{{ banner.text }}</p>
                </div>
            }

            @if (postCheckoutSyncing()) {
                <div class="card mb-4 border-round bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                    <p class="m-0 text-sm text-color">
                        Ödeme onayı işleniyor; oturum ve abonelik durumu birkaç saniye içinde güncellenir. Lütfen bu sayfayı kapatmayın.
                    </p>
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
                                <div class="text-xs text-muted-color mt-1 break-all">{{ s.tenantId || '—' }}</div>
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
                                <span class="text-muted-color">Dönem başlangıcı</span>
                                <span class="font-medium text-right">{{ formatDate(s.currentPeriodStartUtc || s.trialStartsAtUtc) }}</span>
                            </div>
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-muted-color">Dönem sonu</span>
                                <span class="font-medium text-right">{{ formatDate(s.currentPeriodEndUtc || s.trialEndsAtUtc) }}</span>
                            </div>
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-muted-color">Sonraki yenileme</span>
                                <span class="font-medium text-right">{{ formatDate(s.nextBillingAtUtc || s.currentPeriodEndUtc || s.trialEndsAtUtc) }}</span>
                            </div>
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-muted-color">Kalan gün</span>
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
                                <span class="text-muted-color">Salt okunur</span>
                                <span class="font-medium">{{ boolText(s.isReadOnly) }}</span>
                            </div>
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-muted-color">Aboneliği yönetebilir</span>
                                <span class="font-medium">{{ boolText(s.canManageSubscription) }}</span>
                            </div>
                        </div>
                        @if (s.canManageSubscription) {
                            <div class="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                                <p class="m-0 text-sm text-color">
                                    Paket seçtiğinizde güvenli ödeme sağlayıcısına yönlendirilirsiniz. Ödeme sonucu işlendiğinde sistem otomatik güncellenir; bu
                                    sayfaya döndüğünüzde durum yenilenir.
                                </p>
                            </div>
                        } @else {
                            <div class="p-3 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                                <p class="m-0 text-sm text-color">Bu hesapta abonelik bilgisi yalnız görüntülenebilir.</p>
                            </div>
                        }
                    </div>
                </div>

                <div class="col-span-12">
                    <div class="card mb-0">
                        <h5 class="mt-0 mb-4">Kullanılabilir planlar</h5>
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
                                        @if (plan.maxUsers !== null) {
                                            <p class="mt-2 mb-0 text-xs text-muted-color">Maks. kullanıcı: {{ plan.maxUsers }}</p>
                                        }
                                        @if (s.canManageSubscription && !isCurrentPlan(plan, s)) {
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
                                    <div>{{ pendingPlanChangeTypeLabel(pending.changeType) }}</div>
                                </div>
                                <div>
                                    <div class="text-muted-color mb-1">Durum</div>
                                    <div>{{ pendingPlanChangeStatusLabel(pending.status) }}</div>
                                </div>
                                <div>
                                    <div class="text-muted-color mb-1">Uygulanma tarihi</div>
                                    <div>{{ formatDate(pending.effectiveAtUtc || s.currentPeriodEndUtc || s.nextBillingAtUtc) }}</div>
                                </div>
                                <div>
                                    <div class="text-muted-color mb-1">Sonraki yenileme</div>
                                    <div>{{ formatDate(s.nextBillingAtUtc || s.currentPeriodEndUtc) }}</div>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <p-button
                                    type="button"
                                    label="Bekleyen geçişi iptal et"
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
                        </div>
                    </div>
                }

                @if (s.canManageSubscription) {
                    <div class="col-span-12">
                        <div class="card mb-0">
                            <h5 class="mt-0 mb-3">Checkout oturumu</h5>
                            @if (checkoutLoading()) {
                                <app-loading-state message="Checkout oturumu işleniyor…" />
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
                                        <div class="text-muted-color mb-1">Oturum ID</div>
                                        <div class="font-mono text-xs break-all">{{ session.checkoutSessionId }}</div>
                                    </div>
                                    <div>
                                        <div class="text-muted-color mb-1">Süre sonu</div>
                                        <div>{{ formatDateTime(session.expiresAtUtc) }}</div>
                                    </div>
                                    <div>
                                        <div class="text-muted-color mb-1">Provider</div>
                                        <div>{{ providerDisplayLabel(session.provider) }}</div>
                                    </div>
                                    @if (session.externalReference) {
                                        <div class="md:col-span-2">
                                            <div class="text-muted-color mb-1">Harici referans</div>
                                            <div class="font-mono text-xs break-all">{{ session.externalReference }}</div>
                                        </div>
                                    }
                                    <div class="md:col-span-2">
                                        <div class="text-muted-color mb-1">Ödeme bağlantısı</div>
                                        @if (session.checkoutUrl) {
                                            <p class="m-0 text-sm text-color">
                                                Ödeme sağlayıcısına yönlendirileceksiniz. Dönüşte bu sayfa abonelik durumunu yeniler.
                                            </p>
                                        } @else if (session.provider === 'manual') {
                                            <span class="text-muted-color"
                                                >Bu oturum için yönlendirme URL’si yok (manuel / test senaryosu).</span
                                            >
                                        } @else if (expectsHostedCheckoutUrl(session.provider)) {
                                            <span class="text-muted-color"
                                                >Ödeme sağlayıcısı için bağlantı bekleniyordu; şu an URL dönmedi. Yapılandırmayı veya oturumu kontrol edin.</span
                                            >
                                        } @else {
                                            <span class="text-muted-color">Bu oturum için ödeme bağlantısı yok.</span>
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
                                            label="Manuel aktivasyon (test / fallback)"
                                            icon="pi pi-check"
                                            severity="secondary"
                                            [loading]="finalizing()"
                                            [disabled]="!session.canContinue || finalizing() || planActionLoadingCode() !== null || schedulingDowngradeCode() !== null || postCheckoutSyncing()"
                                            (onClick)="finalizeCheckout()"
                                        />
                                    }
                                </div>
                                @if (shouldOfferManualCheckoutFinalize(session)) {
                                    <p class="text-xs text-muted-color mt-3 mb-0">
                                        Bu düğme gerçek kart ödemesi olmadan kiracıyı aktifleştirir; yalnızca Manual provider veya geliştirme fallback’ı içindir.
                                        Hosted ödeme sağlayıcısı kullanıldığında tamamlama genelde ödeme + webhook ile olur.
                                    </p>
                                }
                                @if (!session.canContinue) {
                                    <p class="text-sm text-muted-color mt-3 mb-0">Bu oturum için devam aksiyonu kapalı. Yeni checkout başlatın.</p>
                                }
                            } @else {
                                <p class="text-sm text-muted-color m-0">Henüz bir checkout oturumu başlatılmadı.</p>
                            }
                        </div>
                    </div>
                }

                <div class="col-span-12">
                    <div class="card mb-0">
                        <h5 class="mt-0 mb-3">Bilgi</h5>
                        <ul class="m-0 pl-4 text-sm text-muted-color flex flex-col gap-1">
                            <li>Ödeme hosted ödeme sağlayıcısı üzerinden yapılır; uygulama kart formu toplamaz.</li>
                            <li>Başarılı dönüşten sonra durum birkaç saniye gecikmeli güncellenebilir (webhook).</li>
                            <li>Manuel aktivasyon yalnızca test veya Manual provider için gösterilir.</li>
                        </ul>
                    </div>
                </div>
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
    readonly returnBanner = signal<{ readonly text: string; readonly severity: ReturnBannerSeverity } | null>(null);
    readonly postCheckoutSyncing = signal(false);

    readonly formatDate = (v: string | null | undefined) => formatDateDisplay(v);
    readonly formatDateTime = (v: string | null | undefined) => formatDateTimeDisplay(v);
    readonly shouldOfferManualCheckoutFinalize = shouldOfferManualCheckoutFinalize;
    readonly providerDisplayLabel = subscriptionCheckoutProviderDisplayLabel;
    readonly expectsHostedCheckoutUrl = expectsHostedCheckoutUrl;
    readonly subscriptionPlanLabel = subscriptionPlanLabel;

    ngOnInit(): void {
        const params = this.route.snapshot.queryParamMap;
        const hadReturnQuery = hasSubscriptionCheckoutReturnQuery(params);
        const parsedReturn = parseSubscriptionCheckoutReturn(params);
        if (hadReturnQuery) {
            void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
        }
        this.reload(() => {
            if (hadReturnQuery) {
                this.handleCheckoutReturn(parsedReturn);
            }
        });
    }

    ngOnDestroy(): void {
        this.clearPollTimeout();
    }

    reload(onComplete?: () => void): void {
        this.loading.set(true);
        this.error.set(null);
        forkJoin([this.subscriptions.getSubscriptionSummary(), this.subscriptions.getPendingPlanChange()]).subscribe({
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
                return 'Dönem sonunda bu pakete geç';
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
                this.checkoutError.set(e instanceof Error ? e.message : 'Checkout oturumu yüklenemedi.');
                this.checkoutLoading.set(false);
            }
        });
    }

    finalizeCheckout(): void {
        const sessionId = this.checkoutSession()?.checkoutSessionId;
        if (!sessionId) {
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
                this.checkoutError.set(e instanceof Error ? e.message : 'Checkout oturumu başlatılamadı.');
            }
        });
    }

    daysRemainingText(days: number | null): string {
        if (days === null) {
            return '—';
        }
        return `${days} gün`;
    }

    boolText(value: boolean): string {
        return value ? 'Evet' : 'Hayır';
    }

    pendingPlanChangeTypeLabel(type: PendingPlanChangeTypeKey): string {
        if (type === 'downgrade') {
            return 'Düşürme (dönem sonu)';
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
        const currentIdx = this.planRank(summary.planCode, summary);
        const nextIdx = this.planRank(plan.code, summary);
        if (currentIdx === null || nextIdx === null) {
            return false;
        }
        return nextIdx > currentIdx;
    }

    private isDowngradePlan(plan: SubscriptionPlanVm, summary: SubscriptionSummaryVm): boolean {
        const currentIdx = this.planRank(summary.planCode, summary);
        const nextIdx = this.planRank(plan.code, summary);
        if (currentIdx === null || nextIdx === null) {
            return false;
        }
        return nextIdx < currentIdx;
    }

    private planRank(code: string | null, summary: SubscriptionSummaryVm): number | null {
        const c = code?.trim().toLowerCase();
        if (!c) {
            return null;
        }
        const idx = summary.availablePlans.findIndex((x) => x.code.trim().toLowerCase() === c);
        return idx >= 0 ? idx : null;
    }

    private scheduleDowngrade(targetPlanCode: string): void {
        this.schedulingDowngradeCode.set(targetPlanCode);
        this.planActionError.set(null);
        this.planActionInfo.set(null);
        this.subscriptions.scheduleDowngrade(targetPlanCode).subscribe({
            next: () => {
                this.schedulingDowngradeCode.set(null);
                this.checkoutSession.set(null);
                this.reload(() => this.planActionInfo.set('Paket düşürme dönem sonuna planlandı.'));
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
                text: 'Ödeme sayfasından ayrıldınız veya işlemi iptal ettiniz. Aynı oturuma devam etmek için aşağıdan ödeme akışına dönebilir veya yeni checkout başlatabilirsiniz.'
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
                    text: 'Dönüş algılandı ancak oturum kimliği bulunamadı. Checkout’u bu sayfadan yeniden başlatın.'
                });
                return;
            }
            this.postCheckoutSyncing.set(true);
            this.returnBanner.set({
                severity: 'info',
                text: 'Ödeme sağlayıcısından dönüldü; oturum ve abonelik doğrulanıyor.'
            });
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
                this.checkoutError.set(e instanceof Error ? e.message : 'Checkout oturumu yüklenemedi.');
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
        const maxAttempts = 30;
        if (attempt >= maxAttempts) {
            this.postCheckoutSyncing.set(false);
            this.returnBanner.set({
                severity: 'warn',
                text: 'Abonelik durumu henüz güncellenmediyse webhook gecikmesi olabilir. Bir süre sonra “Durumu yenile” veya sayfayı yeniden yükleyin.'
            });
            return;
        }

        forkJoin([
            this.subscriptions.getCheckout(sessionId),
            this.subscriptions.getSubscriptionSummary(),
            this.subscriptions.getPendingPlanChange()
        ]).subscribe({
            next: ([session, data, pending]) => {
                const summary = this.mergeSummaryWithPending(data, pending);
                this.checkoutSession.set(session);
                this.summary.set(summary);
                this.tenantReadOnlyContext.applySummary(summary);

                const planMatchesTarget = this.planCodeMatchesTarget(summary.planCode, session.targetPlanCode);
                const accessOpened =
                    !summary.isReadOnly && (summary.status === 'active' || summary.status === 'trialing');
                const finalized = session.status === 'finalized';

                if (planMatchesTarget && (accessOpened || finalized)) {
                    this.completePostCheckoutUpgrade(sessionId);
                    return;
                }

                if (planMatchesTarget && summary.isReadOnly && !finalized) {
                    this.pollTimeoutId = setTimeout(() => this.runPostCheckoutSyncRound(sessionId, attempt + 1), 2000);
                    return;
                }

                const terminalFailed =
                    session.status === 'failed' || session.status === 'cancelled' || session.status === 'expired';

                if (terminalFailed) {
                    this.postCheckoutSyncing.set(false);
                    if (session.status === 'cancelled') {
                        this.returnBanner.set({
                            severity: 'secondary',
                            text: 'Checkout oturumu iptal veya kapatılmış görünüyor.'
                        });
                    } else {
                        this.returnBanner.set({
                            severity: 'warn',
                            text: 'Checkout oturumu beklenmedik şekilde kapandı. Gerekirse yeni oturum başlatın.'
                        });
                    }
                    return;
                }

                if (finalized && !planMatchesTarget) {
                    this.pollTimeoutId = setTimeout(() => this.runPostCheckoutSyncRound(sessionId, attempt + 1), 2000);
                    return;
                }

                if (accessOpened && !planMatchesTarget) {
                    this.pollTimeoutId = setTimeout(() => this.runPostCheckoutSyncRound(sessionId, attempt + 1), 2000);
                    return;
                }

                this.pollTimeoutId = setTimeout(() => this.runPostCheckoutSyncRound(sessionId, attempt + 1), 2000);
            },
            error: () => {
                this.pollTimeoutId = setTimeout(() => this.runPostCheckoutSyncRound(sessionId, attempt + 1), 2500);
            }
        });
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
            text: 'Üyeliğiniz başarıyla yükseltildi. Yeni paketiniz artık aktif.'
        });
        if (!hasUpgradeSuccessAck(checkoutSessionId)) {
            markUpgradeSuccessAck(checkoutSessionId);
            this.messageService.add({
                severity: 'success',
                summary: 'Üyeliğiniz başarıyla yükseltildi.',
                detail: 'Yeni paketiniz artık aktif.',
                life: 8000
            });
        }
    }
}
