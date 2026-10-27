import type { SubscriptionBillingPeriod, SubscriptionCheckoutSessionVm, SubscriptionPlanVm, SubscriptionSummaryVm } from '@/app/entities/subscription/models/subscription-vm.model';
import { subscriptionPlanRank } from '@/app/entities/subscription/utils/subscription-plan.utils';

export function isCurrentPlan(plan: SubscriptionPlanVm, summary: SubscriptionSummaryVm): boolean {
    const current = summary.planCode?.trim().toLowerCase();
    const candidate = plan.code.trim().toLowerCase();

    return !!current && current === candidate;
}

export function isUpgradePlan(plan: SubscriptionPlanVm, summary: SubscriptionSummaryVm): boolean {
    const currentIdx = subscriptionPlanRank(summary.planCode);
    const nextIdx = subscriptionPlanRank(plan.code);

    if (currentIdx === null || nextIdx === null) {
        return false;
    }

    return nextIdx > currentIdx;
}

export function isDowngradePlan(plan: SubscriptionPlanVm, summary: SubscriptionSummaryVm): boolean {
    const currentIdx = subscriptionPlanRank(summary.planCode);
    const nextIdx = subscriptionPlanRank(plan.code);

    if (currentIdx === null || nextIdx === null) {
        return false;
    }

    return nextIdx < currentIdx;
}

/** Plan kartındaki eylem yeni oturum açmaz: aynı paket ve dönem için devam ettirilebilir ödeme oturumu var. */
export function hasOpenCheckoutForPlan(plan: SubscriptionPlanVm, session: SubscriptionCheckoutSessionVm | null, billingPeriod: SubscriptionBillingPeriod): boolean {
    if (!session?.targetPlanCode || !session.canContinue) {
        return false;
    }

    return session.targetPlanCode.trim().toLowerCase() === plan.code.trim().toLowerCase() && session.billingPeriod === billingPeriod;
}
