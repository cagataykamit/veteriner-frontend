/** URL query `plan=` değeri (küçük harf). */
export type PricingPlanSlug = 'basic' | 'pro' | 'premium';

/** Backend `planCode` (SubscriptionPlanCatalog). */
export type PricingPlanApiCode = 'Basic' | 'Pro' | 'Premium';

export interface PricingPlanDef {
    readonly slug: PricingPlanSlug;
    readonly apiCode: PricingPlanApiCode;
    readonly title: string;
    readonly description: string;
}

export const PRICING_PLAN_DEFS: readonly PricingPlanDef[] = [
    {
        slug: 'basic',
        apiCode: 'Basic',
        title: 'Basic',
        description: 'Küçük ekipler için temel klinik ve hasta yönetimi.'
    },
    {
        slug: 'pro',
        apiCode: 'Pro',
        title: 'Pro',
        description: 'Büyüyen klinikler için daha kapsamlı operasyon ve raporlama.'
    },
    {
        slug: 'premium',
        apiCode: 'Premium',
        title: 'Premium',
        description: 'Geniş ihtiyaçlar ve öncelikli kullanım için ileri seviye paket.'
    }
] as const;

const slugToDef = new Map<PricingPlanSlug, PricingPlanDef>(
    PRICING_PLAN_DEFS.map((d) => [d.slug, d])
);

/**
 * `?plan=basic|pro|premium` (büyük/küçük harf duyarsız).
 */
export function parsePlanQueryParam(raw: string | null | undefined): PricingPlanDef | null {
    if (raw == null || !String(raw).trim()) {
        return null;
    }
    const key = String(raw).trim().toLowerCase();
    if (key === 'basic' || key === 'pro' || key === 'premium') {
        return slugToDef.get(key as PricingPlanSlug) ?? null;
    }
    return null;
}

export function defByApiCode(code: string | null | undefined): PricingPlanDef | null {
    const t = code?.trim();
    if (!t) {
        return null;
    }
    return PRICING_PLAN_DEFS.find((d) => d.apiCode === t) ?? null;
}
