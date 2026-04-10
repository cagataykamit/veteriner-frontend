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
    isReadOnly?: boolean | null;
    canManageSubscription?: boolean | null;
    availablePlans?: SubscriptionPlanDto[] | null;
}

export interface SubscriptionCheckoutSessionDto {
    checkoutSessionId?: string | null;
    tenantId?: string | null;
    currentPlanCode?: string | null;
    targetPlanCode?: string | null;
    status?: string | null;
    provider?: string | null;
    checkoutUrl?: string | null;
    canContinue?: boolean | null;
    expiresAtUtc?: string | null;
}

export interface StartSubscriptionCheckoutRequestDto {
    targetPlanCode: string;
}

export interface FinalizeSubscriptionCheckoutRequestDto {
    externalReference?: string | null;
}
