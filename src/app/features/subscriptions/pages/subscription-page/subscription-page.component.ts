import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatDateDisplay } from '@/app/shared/utils/date.utils';
import type { SubscriptionCheckoutSessionVm, SubscriptionPlanVm, SubscriptionSummaryVm } from '@/app/features/subscriptions/models/subscription-vm.model';
import { SubscriptionsService } from '@/app/features/subscriptions/services/subscriptions.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import {
    subscriptionCheckoutStatusLabel,
    subscriptionCheckoutStatusSeverity
} from '@/app/features/subscriptions/utils/subscription-checkout-status.utils';
import { subscriptionPlanLabel } from '@/app/features/subscriptions/utils/subscription-plan.utils';
import { subscriptionStatusLabel, subscriptionStatusSeverity } from '@/app/features/subscriptions/utils/subscription-status.utils';

@Component({
    selector: 'app-subscription-page',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppEmptyStateComponent,
        AppStatusTagComponent
    ],
    template: `
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
                        <h5 class="mt-0 mb-4">Deneme dönemi</h5>
                        <div class="flex flex-col gap-3">
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-muted-color">Başlangıç</span>
                                <span class="font-medium text-right">{{ formatDate(s.trialStartsAtUtc) }}</span>
                            </div>
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-muted-color">Bitiş</span>
                                <span class="font-medium text-right">{{ formatDate(s.trialEndsAtUtc) }}</span>
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
                                    Bu fazda gerçek ödeme entegrasyonu henüz aktif değil. Paket aktivasyonu test amaçlı checkout finalize ile tamamlanabilir.
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
                                                    [label]="hasOpenSessionForPlan(plan) ? 'Devam et' : 'Bu paketi aktifleştir'"
                                                    icon="pi pi-arrow-right"
                                                    [loading]="planActionLoadingCode() === plan.code"
                                                    [disabled]="planActionLoadingCode() !== null || finalizing()"
                                                    (onClick)="onPlanAction(plan)"
                                                />
                                            </div>
                                        }
                                    </div>
                                }
                            </div>
                        }
                    </div>
                </div>

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
                                        <div>{{ session.provider || 'Tanımsız' }}</div>
                                    </div>
                                    <div>
                                        <div class="text-muted-color mb-1">Checkout URL</div>
                                        @if (session.checkoutUrl) {
                                            <a [href]="session.checkoutUrl" target="_blank" rel="noopener noreferrer" class="text-primary font-medium no-underline"
                                                >Bağlantıyı aç →</a
                                            >
                                        } @else {
                                            <span class="text-muted-color">Bu fazda provider yönlendirmesi yok.</span>
                                        }
                                    </div>
                                </div>
                                @if (finalizeError()) {
                                    <p class="text-red-500 mt-0 mb-3 text-sm" role="alert">{{ finalizeError() }}</p>
                                }
                                <div class="flex flex-wrap gap-2">
                                    <p-button
                                        type="button"
                                        label="Durumu yenile"
                                        icon="pi pi-refresh"
                                        severity="secondary"
                                        [loading]="checkoutLoading()"
                                        [disabled]="planActionLoadingCode() !== null || finalizing()"
                                        (onClick)="refreshCheckout()"
                                    />
                                    <p-button
                                        type="button"
                                        label="Aktivasyonu tamamla (test)"
                                        icon="pi pi-check"
                                        [loading]="finalizing()"
                                        [disabled]="!session.canContinue || finalizing() || planActionLoadingCode() !== null"
                                        (onClick)="finalizeCheckout()"
                                    />
                                </div>
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
                        <h5 class="mt-0 mb-3">Faz notu</h5>
                        <ul class="m-0 pl-4 text-sm text-muted-color flex flex-col gap-1">
                            <li>Bu fazda gerçek provider ödeme formu ve webhook entegrasyonu yok.</li>
                            <li>Aktivasyon akışı test/dev finalize adımı ile doğrulanır.</li>
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
export class SubscriptionPageComponent implements OnInit {
    private readonly subscriptions = inject(SubscriptionsService);
    private readonly tenantReadOnlyContext = inject(TenantReadOnlyContextService);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly summary = signal<SubscriptionSummaryVm | null>(null);
    readonly checkoutSession = signal<SubscriptionCheckoutSessionVm | null>(null);
    readonly checkoutLoading = signal(false);
    readonly checkoutError = signal<string | null>(null);
    readonly planActionLoadingCode = signal<string | null>(null);
    readonly finalizing = signal(false);
    readonly finalizeError = signal<string | null>(null);
    readonly formatDate = (v: string | null | undefined) => formatDateDisplay(v);
    readonly formatDateTime = (v: string | null | undefined) => formatDateDisplay(v);

    ngOnInit(): void {
        this.reload();
    }

    reload(): void {
        this.loading.set(true);
        this.error.set(null);
        this.subscriptions.getSubscriptionSummary().subscribe({
            next: (data) => {
                this.summary.set(data);
                this.tenantReadOnlyContext.applySummary(data);
                this.finalizeError.set(null);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.summary.set(null);
                this.error.set(e instanceof Error ? e.message : 'Abonelik özeti alınamadı.');
                this.loading.set(false);
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

    onPlanAction(plan: SubscriptionPlanVm): void {
        if (this.hasOpenSessionForPlan(plan)) {
            this.refreshCheckout();
            return;
        }
        this.startCheckout(plan.code);
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
        this.subscriptions.startCheckout(targetPlanCode).subscribe({
            next: (session) => {
                this.checkoutSession.set(session);
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
}
