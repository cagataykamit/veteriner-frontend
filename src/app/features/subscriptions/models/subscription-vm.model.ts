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
    isReadOnly: boolean;
    canManageSubscription: boolean;
    availablePlans: SubscriptionPlanVm[];
}

export type SubscriptionCheckoutStatusKey = 'open' | 'finalized' | 'expired' | 'failed' | 'cancelled' | 'unknown';

export interface SubscriptionCheckoutSessionVm {
    checkoutSessionId: string;
    tenantId: string | null;
    currentPlanCode: string | null;
    targetPlanCode: string | null;
    statusRaw: string | null;
    status: SubscriptionCheckoutStatusKey;
    provider: string | null;
    checkoutUrl: string | null;
    canContinue: boolean;
    expiresAtUtc: string | null;
}
