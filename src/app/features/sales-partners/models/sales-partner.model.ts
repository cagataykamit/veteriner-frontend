/** Satış ortağı ve indirim kodu sözleşme modelleri (`SALES_PARTNER_DISCOUNT_API_CONTRACT.md`); tutarlar kuruş. */

export interface DiscountCodeValidationDto {
    readonly valid: boolean;
    readonly code: string | null;
    readonly discountPercent: number | null;
    readonly discountMonths: number | null;
}

export interface SubscriptionDiscountDto {
    readonly applied: boolean;
    readonly code: string | null;
    readonly discountPercent: number | null;
    readonly discountMonths: number | null;
    readonly windowStartsAtUtc: string | null;
    readonly windowEndsAtUtc: string | null;
    readonly canApply: boolean;
}

export interface SalesPartnerSummaryDto {
    readonly redemptionCount: number;
    readonly trialCustomerCount: number;
    readonly paidCustomerCount: number;
    readonly revenueNetMinor: number;
    readonly commissionEarnedMinor: number;
    readonly commissionPaidMinor: number;
    readonly commissionPendingMinor: number;
    readonly commissionClawbackMinor: number;
}

export interface SalesPartnerDto {
    readonly id: string;
    readonly name: string;
    readonly email: string | null;
    readonly phone: string | null;
    readonly linkedTenantId: string | null;
    readonly isActive: boolean;
    readonly createdAtUtc: string;
    readonly codeCount: number;
    readonly summary: SalesPartnerSummaryDto;
}

export interface DiscountCodeDto {
    readonly id: string;
    readonly salesPartnerId: string;
    readonly code: string;
    readonly discountPercent: number;
    readonly commissionPercent: number;
    readonly validFromUtc: string | null;
    readonly validUntilUtc: string | null;
    readonly maxRedemptions: number | null;
    readonly redemptionCount: number;
    readonly isActive: boolean;
    readonly createdAtUtc: string;
    readonly deactivatedAtUtc: string | null;
}

export interface SalesPartnerDetailDto {
    readonly partner: SalesPartnerDto;
    readonly codes: DiscountCodeDto[];
}

export type CommissionStatus = 'Accrued' | 'Cancelled' | 'Paid';

export interface DiscountCollectionDto {
    readonly id: string;
    readonly checkoutSessionId: string;
    readonly billingPeriod: 'Monthly' | 'Yearly';
    readonly collectedAtUtc: string;
    readonly grossAmountMinor: number;
    readonly discountAmountMinor: number;
    readonly netAmountMinor: number;
    readonly commissionAmountMinor: number;
    readonly status: CommissionStatus;
    readonly paidAtUtc: string | null;
    readonly paidNote: string | null;
    readonly cancelledAtUtc: string | null;
    readonly cancelReason: string | null;
}

export interface DiscountRedemptionRowDto {
    readonly redemptionId: string;
    readonly tenantId: string;
    readonly tenantName: string | null;
    readonly code: string;
    readonly discountPercent: number;
    readonly commissionPercent: number;
    readonly redeemedAtUtc: string;
    readonly windowStartsAtUtc: string | null;
    readonly windowEndsAtUtc: string | null;
    readonly customerStatus: 'Trial' | 'Paid';
    readonly collections: DiscountCollectionDto[];
}

export interface SalesPartnerInput {
    readonly name: string;
    readonly email: string | null;
    readonly phone: string | null;
    readonly linkedTenantId: string | null;
    readonly isActive: boolean;
}

export interface DiscountCodeTermsInput {
    readonly code?: string;
    readonly discountPercent: number;
    readonly commissionPercent: number;
    readonly validFromUtc: string | null;
    readonly validUntilUtc: string | null;
    readonly maxRedemptions: number | null;
}

export const COMMISSION_STATUS_LABELS: Readonly<Record<CommissionStatus, string>> = {
    Accrued: 'Tahakkuk',
    Paid: 'Ödendi',
    Cancelled: 'İptal'
};

/** Kuruş → TL. */
export function minorToAmount(minor: number): number {
    return minor / 100;
}
