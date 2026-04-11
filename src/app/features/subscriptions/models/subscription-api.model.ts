export interface SubscriptionPlanDto {
    code?: string | null;
    name?: string | null;
    description?: string | null;
    maxUsers?: number | null;
}

export interface SubscriptionSummaryDto {
    tenantId?: string | null;
    tenantName?: string | null;
    planCode?: string | null;
    planName?: string | null;
    status?: number | string | null;
    trialStartsAtUtc?: string | null;
    trialEndsAtUtc?: string | null;
    daysRemaining?: number | null;
    currentPeriodStartUtc?: string | null;
    currentPeriodEndUtc?: string | null;
    billingCycleAnchorUtc?: string | null;
    nextBillingAtUtc?: string | null;
    pendingPlanChange?: PendingPlanChangeDto | null;
    isReadOnly?: boolean | null;
    canManageSubscription?: boolean | null;
    availablePlans?: SubscriptionPlanDto[] | null;
}

export interface PendingPlanChangeDto {
    currentPlanCode?: string | null;
    targetPlanCode?: string | null;
    changeType?: number | string | null;
    status?: number | string | null;
    effectiveAtUtc?: string | null;
}

export interface SubscriptionCheckoutSessionDto {
    checkoutSessionId?: string | null;
    tenantId?: string | null;
    currentPlanCode?: string | null;
    targetPlanCode?: string | null;
    /** Backend string veya sayısal enum (ör. Pending=0, RedirectReady=1, Completed=2, …) dönebilir. */
    status?: number | string | null;
    /** Backend string veya sayısal enum (ör. None=0, Manual=1, Stripe=2, Iyzico=3) dönebilir. */
    provider?: number | string | null;
    checkoutUrl?: string | null;
    canContinue?: boolean | null;
    expiresAtUtc?: string | null;
    /** Örn. Stripe session / payment intent referansı — backend dönerse gösterilir. */
    externalReference?: string | null;
    proratedChargeMinor?: number | null;
    chargeCurrencyCode?: string | null;
    prorationRatio?: number | null;
}

export interface StartSubscriptionCheckoutRequestDto {
    targetPlanCode: string;
}

export interface FinalizeSubscriptionCheckoutRequestDto {
    externalReference?: string | null;
}

export interface ScheduleSubscriptionDowngradeRequestDto {
    targetPlanCode: string;
    reason?: string | null;
}
