import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { SubscriptionSummaryVm } from '@/app/entities/subscription/models/subscription-vm.model';
import { subscriptionPlanLabel } from '@/app/entities/subscription/utils/subscription-plan.utils';
import { subscriptionStatusLabel, subscriptionStatusSeverity } from '@/app/entities/subscription/utils/subscription-status.utils';
import {
    isActiveTrialingSubscription,
    isExpiredReadOnlySubscription,
    isSubscriptionPeriodEndPast,
    nextRenewalWaitingText,
    shouldShowMisleadingNextRenewal
} from '@/app/features/subscriptions/utils/subscription-access.utils';
import { SUBSCRIPTION_BILLING_PERIOD_LABELS } from '@/app/features/subscriptions/utils/subscription-billing-period.utils';
import { TrDatePipe } from '@/app/shared/pipes/tr-date.pipe';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

/** Abonelik sayfası üst kartları: kurum özeti, dönem bilgisi, erişim durumu (sayfa ızgarasına doğrudan yerleşir). */
@Component({
    selector: 'app-subscription-summary-cards',
    standalone: true,
    imports: [AppStatusTagComponent, TrDatePipe],
    host: { class: 'contents' },
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        @let s = summary();
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
                    @if (!isTrialingSubscription(s)) {
                        <div class="flex items-center justify-between gap-2">
                            <span class="text-muted-color">Ödeme dönemi</span>
                            <span class="font-medium text-right">{{ billingPeriodLabels[s.billingPeriod] }}</span>
                        </div>
                    }
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-muted-color">{{ periodStartLabel(s) }}</span>
                        <span class="font-medium text-right">{{ periodStartDate(s) | trDate }}</span>
                    </div>
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-muted-color">{{ periodEndLabel(s) }}</span>
                        <span class="font-medium text-right">{{ periodEndDate(s) | trDate }}</span>
                    </div>
                    @if (shouldShowMisleadingNextRenewal(s)) {
                        <div class="flex items-center justify-between gap-2">
                            <span class="text-muted-color">Sonraki yenileme</span>
                            <span class="font-medium text-right">{{ s.nextBillingAtUtc || s.currentPeriodEndUtc | trDate }}</span>
                        </div>
                    } @else if (!isTrialingSubscription(s) && (isExpiredReadOnlySubscription(s) || isSubscriptionPeriodEndPast(s))) {
                        <div class="flex items-center justify-between gap-2">
                            <span class="text-muted-color">Yenileme bekliyor</span>
                            <span class="font-medium text-right">{{ nextRenewalWaitingText(s) }}</span>
                        </div>
                    }
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-muted-color">{{ remainingDaysRowLabel(s) }}</span>
                        <span class="font-medium text-right">{{ daysRemainingText(s.daysRemaining, s) }}</span>
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
                @if (canManage()) {
                    <div class="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                        <p class="m-0 text-sm text-color">{{ subscriptionManageFlowHint(s) }}</p>
                    </div>
                } @else {
                    <div class="p-3 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                        <p class="m-0 text-sm text-color">Plan değişikliği için kurum yöneticinizle iletişime geçin.</p>
                    </div>
                }
            </div>
        </div>
    `
})
export class SubscriptionSummaryCardsComponent {
    readonly summary = input.required<SubscriptionSummaryVm>();
    /** Özet `canManageSubscription` + `Subscriptions.Manage` yetkisi. */
    readonly canManage = input(false);

    readonly billingPeriodLabels = SUBSCRIPTION_BILLING_PERIOD_LABELS;
    readonly isTrialingSubscription = isActiveTrialingSubscription;
    readonly isExpiredReadOnlySubscription = isExpiredReadOnlySubscription;
    readonly isSubscriptionPeriodEndPast = isSubscriptionPeriodEndPast;
    readonly shouldShowMisleadingNextRenewal = shouldShowMisleadingNextRenewal;
    readonly nextRenewalWaitingText = nextRenewalWaitingText;

    statusLabel(summary: SubscriptionSummaryVm): string {
        return subscriptionStatusLabel(summary.status);
    }

    statusSeverity(summary: SubscriptionSummaryVm) {
        return subscriptionStatusSeverity(summary.status);
    }

    currentPlanLabel(summary: SubscriptionSummaryVm): string {
        return subscriptionPlanLabel(summary.planCode, summary.planName);
    }

    daysRemainingText(days: number | null, summary?: SubscriptionSummaryVm): string {
        if (days === null) {
            return '—';
        }

        if (summary && isExpiredReadOnlySubscription(summary) && days === 0) {
            return 'Süre doldu';
        }

        return `${days} gün`;
    }

    /** API `daysRemaining`; deneme dışında etiket genel tutulur (backend alanı semantiği). */
    remainingDaysRowLabel(s: SubscriptionSummaryVm): string {
        return isActiveTrialingSubscription(s) ? 'Kalan deneme süresi' : 'Kalan gün';
    }

    periodStartLabel(s: SubscriptionSummaryVm): string {
        return isActiveTrialingSubscription(s) ? 'Deneme başlangıcı' : 'Dönem başlangıcı';
    }

    periodEndLabel(s: SubscriptionSummaryVm): string {
        if (isExpiredReadOnlySubscription(s)) {
            return 'Süre bitişi';
        }

        return isActiveTrialingSubscription(s) ? 'Deneme bitişi' : 'Dönem sonu';
    }

    periodStartDate(s: SubscriptionSummaryVm): string | null | undefined {
        return isActiveTrialingSubscription(s) ? s.trialStartsAtUtc || s.currentPeriodStartUtc : s.currentPeriodStartUtc || s.trialStartsAtUtc;
    }

    periodEndDate(s: SubscriptionSummaryVm): string | null | undefined {
        return isActiveTrialingSubscription(s) ? s.trialEndsAtUtc || s.currentPeriodEndUtc : s.currentPeriodEndUtc || s.trialEndsAtUtc;
    }

    tenantAccessModeLabel(isReadOnly: boolean): string {
        return isReadOnly ? 'Salt okunur' : 'Aktif';
    }

    boolText(value: boolean): string {
        return value ? 'Evet' : 'Hayır';
    }

    subscriptionManageFlowHint(summary: SubscriptionSummaryVm): string {
        if (isExpiredReadOnlySubscription(summary)) {
            return 'Aboneliğinizi yenilemek için mevcut paketinizde veya istediğiniz pakette ödeme adımını başlatın.';
        }

        return 'Paket yükseltmeleri güvenli ödeme adımıyla tamamlanır. Paket düşürme işlemleri mevcut fatura dönemi sonunda uygulanır.';
    }
}
