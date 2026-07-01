/** URL query `plan=` değeri (küçük harf). */
export type PricingPlanSlug = 'basic' | 'pro' | 'premium';

/** Backend `planCode` (SubscriptionPlanCatalog). */
export type PricingPlanApiCode = 'Basic' | 'Pro' | 'Premium';

export interface PricingPlanDef {
    readonly slug: PricingPlanSlug;
    readonly apiCode: PricingPlanApiCode;
    readonly title: string;
    readonly description: string;
    /** Fiyat etiketi — henüz belli değilse "Fiyat yakında". */
    readonly priceLabel: string;
    /** Fatura dönemi — örn. "/ ay". Boş bırakılabilir. */
    readonly billingPeriodLabel: string;
    /** Deneme açıklaması — örn. "14 gün · ödeme alınmaz". */
    readonly trialLabel: string;
    readonly userLimitLabel: string;
    readonly clinicLimitLabel: string;
    readonly maxUsers: number | null;
    readonly maxClinics: number | null;
    readonly features: readonly string[];
    readonly recommended?: boolean;
    readonly trialDays: number;
}

export const PRICING_PLAN_DEFS: readonly PricingPlanDef[] = [
    {
        slug: 'basic',
        apiCode: 'Basic',
        title: 'Temel',
        description: 'Tek klinik ve küçük ekip için temel veteriner operasyon yönetimi.',
        priceLabel: 'Fiyat yakında',
        billingPeriodLabel: '',
        trialLabel: '14 gün · ödeme alınmaz',
        userLimitLabel: '1 kullanıcı',
        clinicLimitLabel: '1 klinik',
        maxUsers: 1,
        maxClinics: 1,
        trialDays: 14,
        features: [
            'Randevu ve takvim yönetimi',
            'Hasta ve pet kayıtları',
            'Muayene ve aşı takibi',
            'Temel raporlama'
        ]
    },
    {
        slug: 'pro',
        apiCode: 'Pro',
        title: 'Pro',
        description: 'Büyüyen klinikler için çok kullanıcılı ve çok klinikli operasyon.',
        priceLabel: 'Fiyat yakında',
        billingPeriodLabel: '',
        trialLabel: '14 gün · ödeme alınmaz',
        userLimitLabel: '5 kullanıcı',
        clinicLimitLabel: '3 klinik',
        maxUsers: 5,
        maxClinics: 3,
        recommended: true,
        trialDays: 14,
        features: [
            'Temel paketteki tüm modüller',
            'Çok klinikli yapı ve klinik seçimi',
            'Rol bazlı yetkilendirme',
            'Gelişmiş operasyon raporları',
            'Stok ve ödeme modülleri'
        ]
    },
    {
        slug: 'premium',
        apiCode: 'Premium',
        title: 'Premium',
        description: 'Geniş ölçekli işletmeler için sınırsız kullanıcı ve klinik kapasitesi.',
        priceLabel: 'Fiyat yakında',
        billingPeriodLabel: '',
        trialLabel: '14 gün · ödeme alınmaz',
        userLimitLabel: 'Sınırsız kullanıcı',
        clinicLimitLabel: 'Sınırsız klinik',
        maxUsers: null,
        maxClinics: null,
        trialDays: 14,
        features: [
            'Pro paketteki tüm modüller',
            'Sınırsız kullanıcı ve klinik',
            'Kurumsal ölçekte operasyon',
            'Öncelikli kullanım kapasitesi',
            'Genişletilebilir modül vitrini'
        ]
    }
] as const;

/** `/auth/signup` doğrudan açıldığında kullanılan deneme başlangıç paketi. */
export const DEFAULT_SIGNUP_PLAN: PricingPlanDef = PRICING_PLAN_DEFS[0];

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

/** Query param yoksa veya geçersizse varsayılan signup planına düşer. */
export function resolveSignupPlan(raw: string | null | undefined): PricingPlanDef {
    return parsePlanQueryParam(raw) ?? DEFAULT_SIGNUP_PLAN;
}

export function defByApiCode(code: string | null | undefined): PricingPlanDef | null {
    const t = code?.trim();
    if (!t) {
        return null;
    }
    return PRICING_PLAN_DEFS.find((d) => d.apiCode === t) ?? null;
}

/** Backend `planCode`, slug veya görünen ad — büyük/küçük harf duyarsız. */
export function defByPlanKey(code: string | null | undefined): PricingPlanDef | null {
    const slug = parsePlanQueryParam(code);
    if (slug) {
        return slug;
    }
    const byApi = defByApiCode(code);
    if (byApi) {
        return byApi;
    }
    const normalized = (code ?? '').trim().toLowerCase();
    return PRICING_PLAN_DEFS.find((d) => d.apiCode.toLowerCase() === normalized) ?? null;
}
