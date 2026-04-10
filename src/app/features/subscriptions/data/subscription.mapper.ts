import type { SubscriptionCheckoutSessionDto, SubscriptionSummaryDto } from '@/app/features/subscriptions/models/subscription-api.model';
import type { SubscriptionCheckoutSessionVm, SubscriptionPlanVm, SubscriptionSummaryVm } from '@/app/features/subscriptions/models/subscription-vm.model';
import { parseSubscriptionCheckoutStatus } from '@/app/features/subscriptions/utils/subscription-checkout-status.utils';
import { parseSubscriptionStatus } from '@/app/features/subscriptions/utils/subscription-status.utils';

const EM_DASH = '—';

function trimOrNull(value: string | null | undefined): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toDisplay(value: string | null | undefined, fallback = EM_DASH): string {
    return trimOrNull(value) ?? fallback;
}

function toBoolean(value: boolean | null | undefined): boolean {
    return value === true;
}

function toNullableNumber(value: number | null | undefined): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function mapPlan(dto: { code?: string | null; name?: string | null; description?: string | null; maxUsers?: number | null }): SubscriptionPlanVm | null {
    const code = trimOrNull(dto.code);
    const name = trimOrNull(dto.name);
    if (!code && !name) {
        return null;
    }
    return {
        code: code ?? name ?? EM_DASH,
        name: name ?? code ?? EM_DASH,
        description: trimOrNull(dto.description),
        maxUsers: toNullableNumber(dto.maxUsers)
    };
}

export function mapSubscriptionSummaryDtoToVm(dto: SubscriptionSummaryDto): SubscriptionSummaryVm {
    const plans = (dto.availablePlans ?? [])
        .map((x) => mapPlan(x))
        .filter((x): x is SubscriptionPlanVm => !!x);

    return {
        tenantId: trimOrNull(dto.tenantId),
        tenantName: toDisplay(dto.tenantName),
        planCode: trimOrNull(dto.planCode),
        planName: toDisplay(dto.planName),
        statusRaw: dto.status ?? null,
        status: parseSubscriptionStatus(dto.status),
        trialStartsAtUtc: trimOrNull(dto.trialStartsAtUtc),
        trialEndsAtUtc: trimOrNull(dto.trialEndsAtUtc),
        daysRemaining: toNullableNumber(dto.daysRemaining),
        isReadOnly: toBoolean(dto.isReadOnly),
        canManageSubscription: toBoolean(dto.canManageSubscription),
        availablePlans: plans
    };
}

export function mapSubscriptionCheckoutSessionDtoToVm(dto: SubscriptionCheckoutSessionDto): SubscriptionCheckoutSessionVm {
    return {
        checkoutSessionId: trimOrNull(dto.checkoutSessionId) ?? '',
        tenantId: trimOrNull(dto.tenantId),
        currentPlanCode: trimOrNull(dto.currentPlanCode),
        targetPlanCode: trimOrNull(dto.targetPlanCode),
        statusRaw: trimOrNull(dto.status),
        status: parseSubscriptionCheckoutStatus(dto.status),
        provider: trimOrNull(dto.provider),
        checkoutUrl: trimOrNull(dto.checkoutUrl),
        canContinue: toBoolean(dto.canContinue),
        expiresAtUtc: trimOrNull(dto.expiresAtUtc)
    };
}
