export type SubscriptionStatusKey = 'trialing' | 'active' | 'readonly' | 'cancelled' | 'unknown';

export interface SubscriptionPlanVm {
    code: string;
    name: string;
    description: string | null;
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
