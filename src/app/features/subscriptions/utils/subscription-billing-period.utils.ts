import type { SubscriptionBillingPeriod, SubscriptionSummaryVm } from '@/app/features/subscriptions/models/subscription-vm.model';
import { isActivePaidSubscription, isActiveTrialingSubscription, isExpiredReadOnlySubscription } from '@/app/features/subscriptions/utils/subscription-access.utils';

/** Ödeme dönemi etiketleri (BILL-001). */
export const SUBSCRIPTION_BILLING_PERIOD_LABELS: Readonly<Record<SubscriptionBillingPeriod, string>> = {
    Monthly: 'Aylık',
    Yearly: 'Yıllık'
};

/**
 * Dönem seçilebilir mi (BILL-001, backend `StartSubscriptionCheckout` kuralı): deneme sürerken seçilmez (ilk ödemede seçilir);
 * etkin yıllık dönemde aylığa dönülmez (dönem bitince yenilemede seçilir). Süresi dolmuşsa ya da aylıktaysa seçilir.
 */
export function canChooseBillingPeriod(summary: SubscriptionSummaryVm): boolean {
    if (isActiveTrialingSubscription(summary)) {
        return false;
    }

    return isExpiredReadOnlySubscription(summary) || summary.billingPeriod === 'Monthly';
}

/** Etkin aylık dönemde yıllık seçildi: mevcut paket için de ödeme başlatılır, kalan günler ücretten düşülür. */
export function isSwitchToYearly(summary: SubscriptionSummaryVm, selected: SubscriptionBillingPeriod): boolean {
    return selected === 'Yearly' && summary.billingPeriod === 'Monthly' && isActivePaidSubscription(summary);
}
