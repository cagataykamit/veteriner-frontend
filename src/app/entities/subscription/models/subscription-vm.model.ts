/** Ödeme dönemi (BILL-001); backend string değeriyle aynı. */
export type SubscriptionBillingPeriod = 'Monthly' | 'Yearly';

export type SubscriptionStatusKey = 'trialing' | 'active' | 'readonly' | 'cancelled' | 'unknown';

export interface SubscriptionPlanVm {
    code: string;
    name: string;
    description: string | null;
    maxUsers: number | null;
    /** Liste fiyatı TL, KDV hariç (backend `subscription-summary`, WEB-007); yoksa `null`. */
    monthlyPriceTry: number | null;
    yearlyPriceTry: number | null;
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
    /** Dönem sonunda pakete sığmadığı için uygulanmayan son düşürme ve bugünkü sayılar (ADR-035 2026-11-08); yoksa `null`. */
    rejectedPlanChange: PendingPlanChangeVm | null;
    isReadOnly: boolean;
    canManageSubscription: boolean;
    availablePlans: SubscriptionPlanVm[];
    billingPeriod: SubscriptionBillingPeriod;
}

export type PendingPlanChangeTypeKey = 'downgrade' | 'upgrade' | 'unknown';
export type PendingPlanChangeStatusKey = 'pending' | 'scheduled' | 'cancelled' | 'applied' | 'rejected' | 'unknown';

/**
 * Hedef paketin sınırları ve bugünkü kullanım (backend `Subscriptions.PlanLimitsExceeded` yanıtı ve `rejectedPlanChange.fit`).
 * `maxActiveClinics` `null` ise klinik sınırı yok; kullanıcı sayımı üye + bekleyen davettir.
 */
export interface SubscriptionPlanFitVm {
    targetPlanCode: string;
    maxActiveClinics: number | null;
    maxUsers: number;
    activeClinicCount: number;
    memberCount: number;
    pendingInviteCount: number;
    excessClinicCount: number;
    excessUserCount: number;
}

export interface PendingPlanChangeVm {
    currentPlanCode: string | null;
    targetPlanCode: string | null;
    changeTypeRaw: string | number | null;
    changeType: PendingPlanChangeTypeKey;
    statusRaw: string | number | null;
    status: PendingPlanChangeStatusKey;
    effectiveAtUtc: string | null;
    /** Yalnız uygulanmayan (`rejected`) değişiklikte dolu. */
    fit: SubscriptionPlanFitVm | null;
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
    billingPeriod: SubscriptionBillingPeriod;
    /** BILL-005: ödeme aynı denemede ikinci ödeme sayıldı; paket açılmadı, iade ediliyor ya da edildi. */
    duplicatePaymentRefund: boolean;
}
