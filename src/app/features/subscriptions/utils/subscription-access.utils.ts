import type { SubscriptionSummaryVm } from '@/app/entities/subscription/models/subscription-vm.model';

/** Kiracı yazma erişimi kapalı — ödeme/yenileme CTA akışı gerekir. */
export function isExpiredReadOnlySubscription(summary: SubscriptionSummaryVm): boolean {
    return summary.isReadOnly === true;
}

/** Aktif deneme — plan schedule / downgrade metinleri korunur. */
export function isActiveTrialingSubscription(summary: SubscriptionSummaryVm): boolean {
    return summary.status === 'trialing' && !summary.isReadOnly;
}

/** Aktif ücretli abonelik — upgrade/downgrade akışı korunur. */
export function isActivePaidSubscription(summary: SubscriptionSummaryVm): boolean {
    return summary.status === 'active' && !summary.isReadOnly;
}

/** Deneme bitmiş, salt okunur kiracı (aktif deneme değil). */
export function isTrialExpiredReadOnly(summary: SubscriptionSummaryVm): boolean {
    if (!summary.isReadOnly || summary.status === 'trialing') {
        return false;
    }

    return !!summary.trialEndsAtUtc?.trim() && summary.status !== 'active';
}

/** Ücretli abonelik süresi bitmiş salt okunur kiracı. */
export function isPaidExpiredReadOnly(summary: SubscriptionSummaryVm): boolean {
    return isExpiredReadOnlySubscription(summary) && !isTrialExpiredReadOnly(summary);
}

export function expiredReadOnlyBannerMessage(summary: SubscriptionSummaryVm): string {
    if (isTrialExpiredReadOnly(summary)) {
        return 'Deneme süreniz sona erdi. Devam etmek için paket seçip ödeme yapın.';
    }

    if (isPaidExpiredReadOnly(summary)) {
        return 'Abonelik süreniz sona erdi. Yazma işlemlerini açmak için paket seçip ödeme yapın.';
    }

    if (isExpiredReadOnlySubscription(summary)) {
        return 'Aboneliğiniz salt okunur modda. Yazma işlemlerini açmak için ödeme yapın.';
    }

    return '';
}

export function subscriptionPeriodEndUtc(summary: SubscriptionSummaryVm): string | null | undefined {
    return summary.status === 'trialing'
        ? summary.trialEndsAtUtc || summary.currentPeriodEndUtc
        : summary.currentPeriodEndUtc || summary.trialEndsAtUtc;
}

export function isSubscriptionPeriodEndPast(summary: SubscriptionSummaryVm): boolean {
    const endRaw = subscriptionPeriodEndUtc(summary);

    if (!endRaw?.trim()) {
        return summary.daysRemaining === 0;
    }

    const end = new Date(endRaw);

    if (Number.isNaN(end.getTime())) {
        return summary.daysRemaining === 0;
    }

    return end.getTime() < Date.now();
}

export function shouldShowMisleadingNextRenewal(summary: SubscriptionSummaryVm): boolean {
    if (isActiveTrialingSubscription(summary)) {
        return false;
    }

    return !isExpiredReadOnlySubscription(summary) && !isSubscriptionPeriodEndPast(summary);
}

/** Expired/read-only yenileme veya paket seçimi checkout'u — proration değil tam ödeme metni. */
export function isRenewalCheckoutContext(summary: SubscriptionSummaryVm): boolean {
    return isExpiredReadOnlySubscription(summary);
}
