import type { PendingPlanChangeDto, SubscriptionCheckoutSessionDto, SubscriptionPlanDto, SubscriptionPlanFitDto, SubscriptionSummaryDto } from '@/app/entities/subscription/models/subscription-api.model';
import { priceMinorToTry } from '@/app/entities/subscription/utils/pricing-plan.utils';
import type {
    PendingPlanChangeStatusKey,
    PendingPlanChangeTypeKey,
    PendingPlanChangeVm,
    SubscriptionBillingPeriod,
    SubscriptionCheckoutSessionVm,
    SubscriptionPlanFitVm,
    SubscriptionPlanVm,
    SubscriptionSummaryVm
} from '@/app/entities/subscription/models/subscription-vm.model';
import { parseSubscriptionCheckoutProvider } from '@/app/entities/subscription/utils/subscription-checkout-provider.utils';
import { parseSubscriptionCheckoutStatus } from '@/app/entities/subscription/utils/subscription-checkout-status.utils';
import { parseSubscriptionStatus } from '@/app/entities/subscription/utils/subscription-status.utils';

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

function toNullableDecimal(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const n = Number.parseFloat(value);

        return Number.isFinite(n) ? n : null;
    }

    return null;
}

function toRawNumberOrString(value: unknown): number | string | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string' && value.trim()) {
        const t = value.trim();

        if (/^-?\d+$/.test(t)) {
            return Number.parseInt(t, 10);
        }

        return t;
    }

    return null;
}

/** Backend `SubscriptionPlanChangeType`: Upgrade = 1, Downgrade = 2 (JSON sayı). */
function parsePendingPlanChangeType(raw: unknown): PendingPlanChangeTypeKey {
    const v = toRawNumberOrString(raw);

    if (typeof v === 'number') {
        if (v === 1) {
            return 'upgrade';
        }

        if (v === 2) {
            return 'downgrade';
        }

        return 'unknown';
    }

    if (typeof v === 'string') {
        const t = v.trim();

        if (/^-?\d+$/.test(t)) {
            return parsePendingPlanChangeType(Number.parseInt(t, 10));
        }

        const n = t.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (['downgrade', 'down', 'lower'].includes(n)) {
            return 'downgrade';
        }

        if (['upgrade', 'up', 'higher'].includes(n)) {
            return 'upgrade';
        }
    }

    return 'unknown';
}

function parsePendingPlanChangeStatus(raw: unknown): PendingPlanChangeStatusKey {
    const v = toRawNumberOrString(raw);

    if (typeof v === 'number') {
        if (v === 0) return 'pending';
        if (v === 1) return 'scheduled';
        if (v === 2) return 'cancelled';
        if (v === 3) return 'applied';
        if (v === 4) return 'rejected';

        return 'unknown';
    }

    if (typeof v === 'string') {
        const n = v.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

        if (['pending', 'waiting'].includes(n)) return 'pending';
        if (['scheduled', 'activepending', 'queued'].includes(n)) return 'scheduled';
        if (['cancelled', 'canceled'].includes(n)) return 'cancelled';
        if (['applied', 'completed'].includes(n)) return 'applied';
        if (n === 'rejected') return 'rejected';
    }

    return 'unknown';
}

function readPendingPlanChangeTypeRaw(dto: PendingPlanChangeDto): unknown {
    const o = dto as unknown as Record<string, unknown>;

    return o['changeType'] ?? o['ChangeType'] ?? o['planChangeType'] ?? o['PlanChangeType'] ?? o['transitionType'] ?? o['TransitionType'];
}

export function mapPendingPlanChangeDtoToVm(dto: PendingPlanChangeDto | null | undefined): PendingPlanChangeVm | null {
    if (!dto) {
        return null;
    }

    const target = trimOrNull(dto.targetPlanCode);
    const current = trimOrNull(dto.currentPlanCode);
    const changeTypeSource = readPendingPlanChangeTypeRaw(dto);
    const changeTypeRaw = toRawNumberOrString(changeTypeSource);
    const statusRaw = toRawNumberOrString(dto.status);
    const effective = trimOrNull(dto.effectiveAtUtc);

    if (!target && !current && !effective && changeTypeRaw === null && statusRaw === null) {
        return null;
    }

    return {
        currentPlanCode: current,
        targetPlanCode: target,
        changeTypeRaw,
        changeType: parsePendingPlanChangeType(changeTypeSource),
        statusRaw,
        status: parsePendingPlanChangeStatus(dto.status),
        effectiveAtUtc: effective,
        fit: mapSubscriptionPlanFitDtoToVm(dto.fit)
    };
}

/** Sığma bilgisi; hedef paket kodu yoksa `null`. Sayılar eksikse 0, klinik sınırı yoksa `null` (sınırsız). */
export function mapSubscriptionPlanFitDtoToVm(dto: SubscriptionPlanFitDto | null | undefined): SubscriptionPlanFitVm | null {
    const target = trimOrNull(dto?.targetPlanCode);

    if (!dto || !target) {
        return null;
    }

    const count = (v: number | null | undefined): number => toNullableNumber(v) ?? 0;

    return {
        targetPlanCode: target,
        maxActiveClinics: toNullableNumber(dto.maxActiveClinics),
        maxUsers: count(dto.maxUsers),
        activeClinicCount: count(dto.activeClinicCount),
        memberCount: count(dto.memberCount),
        pendingInviteCount: count(dto.pendingInviteCount),
        excessClinicCount: count(dto.excessClinicCount),
        excessUserCount: count(dto.excessUserCount)
    };
}

function mapPlan(dto: SubscriptionPlanDto): SubscriptionPlanVm | null {
    const code = trimOrNull(dto.code);
    const name = trimOrNull(dto.name);

    if (!code && !name) {
        return null;
    }

    return {
        code: code ?? name ?? EM_DASH,
        name: name ?? code ?? EM_DASH,
        description: trimOrNull(dto.description),
        maxUsers: toNullableNumber(dto.maxUsers),
        monthlyPriceTry: priceMinorToTry(dto.monthlyPriceMinor),
        yearlyPriceTry: priceMinorToTry(dto.yearlyPriceMinor)
    };
}

/** Bilinmeyen/boş değer aylık sayılır (backend varsayılanı). */
function parseBillingPeriod(value: string | null | undefined): SubscriptionBillingPeriod {
    return value?.trim().toLowerCase() === 'yearly' ? 'Yearly' : 'Monthly';
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
        currentPeriodStartUtc: trimOrNull(dto.currentPeriodStartUtc),
        currentPeriodEndUtc: trimOrNull(dto.currentPeriodEndUtc),
        billingCycleAnchorUtc: trimOrNull(dto.billingCycleAnchorUtc),
        nextBillingAtUtc: trimOrNull(dto.nextBillingAtUtc),
        pendingPlanChange: mapPendingPlanChangeDtoToVm(dto.pendingPlanChange),
        rejectedPlanChange: mapPendingPlanChangeDtoToVm(dto.rejectedPlanChange),
        isReadOnly: toBoolean(dto.isReadOnly),
        canManageSubscription: toBoolean(dto.canManageSubscription),
        availablePlans: plans,
        billingPeriod: parseBillingPeriod(dto.billingPeriod)
    };
}

function checkoutSessionStatusRaw(dto: SubscriptionCheckoutSessionDto): string | number | null {
    const s = dto.status;

    if (s === null || s === undefined) {
        return null;
    }

    if (typeof s === 'number' || typeof s === 'string') {
        return s;
    }

    return null;
}

export function mapSubscriptionCheckoutSessionDtoToVm(dto: SubscriptionCheckoutSessionDto): SubscriptionCheckoutSessionVm {
    return {
        checkoutSessionId: trimOrNull(dto.checkoutSessionId) ?? '',
        tenantId: trimOrNull(dto.tenantId),
        currentPlanCode: trimOrNull(dto.currentPlanCode),
        targetPlanCode: trimOrNull(dto.targetPlanCode),
        statusRaw: checkoutSessionStatusRaw(dto),
        status: parseSubscriptionCheckoutStatus(dto.status),
        provider: parseSubscriptionCheckoutProvider(dto.provider),
        checkoutUrl: trimOrNull(dto.checkoutUrl),
        canContinue: toBoolean(dto.canContinue),
        expiresAtUtc: trimOrNull(dto.expiresAtUtc),
        externalReference: trimOrNull(dto.externalReference),
        proratedChargeMinor: toNullableNumber(dto.proratedChargeMinor),
        chargeCurrencyCode: trimOrNull(dto.chargeCurrencyCode),
        prorationRatio: toNullableDecimal(dto.prorationRatio),
        billingPeriod: parseBillingPeriod(dto.billingPeriod),
        duplicatePaymentRefund: trimOrNull(dto.refundStatus) !== null
    };
}
