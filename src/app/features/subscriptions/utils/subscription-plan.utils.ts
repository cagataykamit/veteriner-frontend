import { defByPlanKey } from '@/app/features/public/utils/pricing-plan.utils';

const PLAN_LABELS: Record<string, string> = {
    basic: 'Temel',
    pro: 'Pro',
    premium: 'Premium'
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

export interface SubscriptionPlanLimitLabels {
    readonly userLimitLabel: string;
    readonly clinicLimitLabel: string;
}

/** Public paket tanımıyla hizalı kullanıcı / klinik limit etiketleri. */
export function subscriptionPlanLimitLabels(code: string | null | undefined): SubscriptionPlanLimitLabels | null {
    const def = defByPlanKey(code);
    if (!def) {
        return null;
    }
    return {
        userLimitLabel: def.userLimitLabel,
        clinicLimitLabel: def.clinicLimitLabel
    };
}
