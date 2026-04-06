export interface SubscriptionPlanDto {
    code?: string | null;
    name?: string | null;
    description?: string | null;
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
