export type SubscriptionStatusKey = 'trialing' | 'active' | 'readonly' | 'cancelled' | 'unknown';

export interface SubscriptionPlanVm {
    code: string;
    name: string;
    description: string | null;
    maxUsers: number | null;
}

export interface SubscriptionSummaryVm {
    tenantId: string | null;
    tenantName: string;
    planCode: string | null;
    planName: string;
    statusRaw: number | string | null;
    status: SubscriptionStatusKey;
    trialStartsAtUtc: string | null;
    trialEndsAtUtc: string | null;
    daysRemaining: number | null;
    currentPeriodStartUtc: string | null;
    currentPeriodEndUtc: string | null;
    billingCycleAnchorUtc: string | null;
    nextBillingAtUtc: string | null;
    pendingPlanChange: PendingPlanChangeVm | null;
    isReadOnly: boolean;
    canManageSubscription: boolean;
    availablePlans: SubscriptionPlanVm[];
}

export type PendingPlanChangeTypeKey = 'downgrade' | 'upgrade' | 'unknown';
export type PendingPlanChangeStatusKey = 'pending' | 'scheduled' | 'cancelled' | 'applied' | 'unknown';

export interface PendingPlanChangeVm {
    currentPlanCode: string | null;
    targetPlanCode: string | null;
    changeTypeRaw: string | number | null;
    changeType: PendingPlanChangeTypeKey;
    statusRaw: string | number | null;
    status: PendingPlanChangeStatusKey;
    effectiveAtUtc: string | null;
}

export type SubscriptionCheckoutStatusKey =
    | 'open'
    | 'redirect_ready'
    | 'processing'
    | 'finalized'
    | 'expired'
    | 'failed'
    | 'cancelled'
    | 'unknown';

/** Checkout provider — mapper sayı/string API değerini buraya indirger. */
export type SubscriptionCheckoutProviderSlug = 'none' | 'manual' | 'stripe' | 'iyzico';

export interface SubscriptionCheckoutSessionVm {
    checkoutSessionId: string;
    tenantId: string | null;
    currentPlanCode: string | null;
    targetPlanCode: string | null;
    statusRaw: string | number | null;
    status: SubscriptionCheckoutStatusKey;
    /** Bilinen provider; parse edilemezse `null` (UI: Tanımsız). */
    provider: SubscriptionCheckoutProviderSlug | null;
    checkoutUrl: string | null;
    canContinue: boolean;
    expiresAtUtc: string | null;
    externalReference: string | null;
    proratedChargeMinor: number | null;
    chargeCurrencyCode: string | null;
    prorationRatio: number | null;
}
