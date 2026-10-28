import type { SubscriptionBillingPeriod } from '@/app/entities/subscription/models/subscription-vm.model';
import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

/** Çift ödeme satırı sözleşme modeli (`GET api/v1/admin/billing/duplicate-payments`); tutar kuruş. */

export type DuplicatePaymentRefundStatus = 'Pending' | 'Refunded' | 'ManualRequired';

export type DuplicatePaymentProvider = 'Iyzico' | 'Stripe' | 'Manual';

export interface DuplicatePaymentDto {
    readonly checkoutSessionId: string;
    readonly tenantId: string;
    readonly tenantName: string | null;
    readonly targetPlanCode: string;
    readonly billingPeriod: SubscriptionBillingPeriod;
    readonly provider: DuplicatePaymentProvider;
    readonly amountMinor: number | null;
    readonly currencyCode: string;
    readonly detectedAtUtc: string;
    readonly refundStatus: DuplicatePaymentRefundStatus;
    readonly refundAttemptCount: number;
    readonly refundFailureReason: string | null;
    readonly refundedAtUtc: string | null;
}

export const REFUND_STATUS_LABELS: Readonly<Record<DuplicatePaymentRefundStatus, string>> = {
    Pending: 'İade sürüyor',
    Refunded: 'İade edildi',
    ManualRequired: 'Elle iade gerekli'
};

export const REFUND_STATUS_SEVERITIES: Readonly<Record<DuplicatePaymentRefundStatus, StatusTagSeverity>> = {
    Pending: 'info',
    Refunded: 'success',
    ManualRequired: 'danger'
};
