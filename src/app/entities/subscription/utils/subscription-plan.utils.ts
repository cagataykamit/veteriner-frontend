import type { SubscriptionBillingPeriod } from '@/app/entities/subscription/models/subscription-vm.model';
import { PRICING_PLAN_DEFS } from '@/app/entities/subscription/utils/pricing-plan.utils';

/** Paket adları tek kaynaktan (ADR-035): `basic` → "Temel", `pro` → "Profesyonel", `premium` → "Kurumsal". */
const PLAN_LABELS: Record<string, string> = Object.fromEntries(PRICING_PLAN_DEFS.map((d) => [d.slug, d.title]));

/** Ödeme dönemi etiketleri (BILL-001). */
export const SUBSCRIPTION_BILLING_PERIOD_LABELS: Readonly<Record<SubscriptionBillingPeriod, string>> = {
    Monthly: 'Aylık',
    Yearly: 'Yıllık'
};

/** Backend plan sırası: Basic = 0, Pro = 1, Premium = 2 */
const PLAN_RANK: Record<string, number> = {
    basic: 0,
    pro: 1,
    premium: 2
};

function normalizePlanKey(value: string | null | undefined): string {
    return (value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

export function subscriptionPlanRank(code: string | null | undefined): number | null {
    const k = normalizePlanKey(code);

    if (!k) {
        return null;
    }

    const r = PLAN_RANK[k];

    return typeof r === 'number' ? r : null;
}

export function subscriptionPlanLabel(code: string | null | undefined, name: string | null | undefined): string {
    const byCode = PLAN_LABELS[normalizePlanKey(code)];

    if (byCode) {
        return byCode;
    }

    const byName = PLAN_LABELS[normalizePlanKey(name)];

    if (byName) {
        return byName;
    }

    const displayName = name?.trim();

    if (displayName) {
        return displayName;
    }

    const displayCode = code?.trim();

    if (displayCode) {
        return displayCode;
    }

    return '—';
}
