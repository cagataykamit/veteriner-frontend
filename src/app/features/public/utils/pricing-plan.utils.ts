/**
 * Paketler — fiyat, sınır ve paket içeriğinin TEK veri kaynağı (ADR-035). Tanıtım `/paketler`, ana sayfa, SSS, SEO/JSON-LD,
 * kayıt `?plan=` ve panel abonelik kartı buradan beslenir; sayılar başka yere kopyalanmaz. Fiyat ya da sınır değişince
 * yalnız PRICING_PLAN_DEFS ve PRICING_FEATURE_ROWS düzenlenir. `null` alan sayfada hiç gösterilmez.
 */

/** URL query `plan=` değeri (küçük harf). */
export type PricingPlanSlug = 'basic' | 'pro' | 'premium';

/** Backend `planCode` (SubscriptionPlanCatalog). */
export type PricingPlanApiCode = 'Basic' | 'Pro' | 'Premium';

/** Kullanıcı/klinik sınırı: sayı, `'sinirsiz'`, `'coklu'` (çok klinik) ya da `null` (gösterilmez). */
export type PricingPlanLimit = number | 'sinirsiz' | 'coklu' | null;

/** Ödeme dönemi (paketler sayfasındaki aylık/yıllık seçici). */
export type PricingBillingPeriod = 'monthly' | 'yearly';

export interface PricingPlanDef {
    readonly slug: PricingPlanSlug;
    readonly apiCode: PricingPlanApiCode;
    readonly title: string;
    /** Kime göre, tek cümle (kayıt sayfası ve paket kartı). */
    readonly description: string;
    /** Aylık tutar, TL, KDV hariç. `null` ve `priceOnRequest` ise "İletişime geçin". */
    readonly monthlyPriceTry: number | null;
    /** Yıllık peşin tutar, TL, KDV hariç. */
    readonly yearlyPriceTry: number | null;
    /** Fiyat teklifle belirlenir (kartta "İletişime geçin", düğme iletişim sayfasına). */
    readonly priceOnRequest: boolean;
    readonly maxUsers: PricingPlanLimit;
    readonly maxClinics: PricingPlanLimit;
    /** "Önerilen" etiketi (en çok bir paket; tasarım belgesi 5.5 orta kart). */
    readonly recommended: boolean;
    readonly trialDays: number;
}

/** Fiyatların vergi notu (ADR-035: KDV hariç). */
export const PRICING_VAT_NOTE = 'KDV hariç';

/**
 * VERİ — paketler (ADR-035 tablosu). Kullanıcı sınırının backend karşılığı `SubscriptionPlanCatalog`; ürün içinde
 * zorlanması ayrı iştir (ADR-035 Sonuçlar).
 */
export const PRICING_PLAN_DEFS: readonly PricingPlanDef[] = [
    {
        slug: 'basic',
        apiCode: 'Basic',
        title: 'Temel',
        description: 'Tek klinik ve küçük ekip için.',
        monthlyPriceTry: 999,
        yearlyPriceTry: 9990,
        priceOnRequest: false,
        maxUsers: 3,
        maxClinics: 1,
        recommended: false,
        trialDays: 14
    },
    {
        slug: 'pro',
        apiCode: 'Pro',
        title: 'Profesyonel',
        description: 'Birkaç kullanıcıyla çalışan ve hasta sahiplerine portal sunan klinikler için.',
        monthlyPriceTry: 1990,
        yearlyPriceTry: 19900,
        priceOnRequest: false,
        maxUsers: 10,
        maxClinics: 1,
        recommended: true,
        trialDays: 14
    },
    {
        slug: 'premium',
        apiCode: 'Premium',
        title: 'Kurumsal',
        description: 'Birden fazla şubesi olan işletmeler için.',
        monthlyPriceTry: null,
        yearlyPriceTry: null,
        priceOnRequest: true,
        maxUsers: 'sinirsiz',
        maxClinics: 'coklu',
        recommended: false,
        trialDays: 14
    }
];

/** Karşılaştırma hücresi: `true` var, `false` yok, metin kısa değer (örn. "E-posta"); `null` gösterilmez. */
export type PricingFeatureCell = boolean | string | null;

export interface PricingFeatureRowDef {
    readonly group: string;
    readonly label: string;
    /** Satırın altındaki kısa açıklama. */
    readonly detail?: string;
    readonly plans: Readonly<Record<PricingPlanSlug, PricingFeatureCell>>;
}

const ALL: Readonly<Record<PricingPlanSlug, PricingFeatureCell>> = { basic: true, pro: true, premium: true };

/**
 * VERİ — özellik × paket (ADR-035 tablosu). Yasal kayıt defterleri ve KVKK araçları hiçbir pakette kilitlenmez;
 * fark kullanıcı sayısı, çok klinik ve hasta sahibi portalıdır.
 */
export const PRICING_FEATURE_ROWS: readonly PricingFeatureRowDef[] = [
    {
        group: 'Klinik iş akışı',
        label: 'Çekirdek klinik akış',
        detail: 'Bugün/geliş, randevu, muayene, hasta kartı ve zaman çizelgesi, aşı, tedavi/reçete, lab durumu, yatış',
        plans: ALL
    },
    { group: 'Klinik iş akışı', label: 'Ücret, tahsilat, bakiye, gün sonu, stok ve satış', plans: ALL },
    {
        group: 'Kayıt ve KVKK',
        label: 'Kayıt defterleri, Aşı Bilgi Raporu, KVKK formları',
        detail: 'Aydınlatma ve açık rıza formları, veri kopyası',
        plans: ALL
    },
    { group: 'Yönetim', label: 'Eski sistemden veri aktarımı (içe aktarma sihirbazı)', plans: ALL },
    { group: 'Yönetim', label: 'Rol bazlı yetki, denetim kaydı', plans: ALL },
    { group: 'Yönetim', label: 'Çok klinik yönetimi ve klinikler arası yetki', plans: { basic: false, pro: false, premium: true } },
    {
        group: 'Hasta sahibi',
        label: 'Hasta sahibi portalı',
        detail: 'Aşı, randevu, bakiye; telefonda ana ekrana eklenebilir',
        plans: { basic: false, pro: true, premium: true }
    },
    { group: 'Destek', label: 'Destek', plans: { basic: 'E-posta', pro: 'E-posta, öncelikli', premium: 'Özel iletişim, kurulum desteği' } }
];

/** Şu an olmayanlar (ADR-035): dürüst kısa liste, paketten bağımsız; tarih ya da vaat yazılmaz. */
export const PRICING_NOT_AVAILABLE: readonly string[] = ['SMS hatırlatma (hatırlatmalar e-posta ile gider)', 'e-Fatura', 'Online ödeme', 'Online randevu'];

const formatTry = (amount: number): string => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);

/** `999` → "₺999"; `null` → `null`. */
export function formatPlanPrice(amount: number | null): string | null {
    return amount == null ? null : formatTry(amount);
}

/** `3, 'kullanıcı'` → "3 kullanıcı"; `'sinirsiz'` → "Sınırsız kullanıcı"; `'coklu'` → "Çok klinik"; `null` → `null`. */
export function formatPlanLimit(limit: PricingPlanLimit, unit: string): string | null {
    if (limit == null) {
        return null;
    }

    if (limit === 'sinirsiz') {
        return `Sınırsız ${unit}`;
    }

    return limit === 'coklu' ? `Çok ${unit}` : `${limit} ${unit}`;
}

export interface PricingPriceView {
    /** "₺999" ya da "İletişime geçin". */
    readonly amount: string;
    /** "/ ay", "/ yıl"; teklifli pakette `null`. */
    readonly unit: string | null;
}

/** Kart ve tablo için fiyat görünümü; tutar ve teklif bilgisi yoksa `null`. */
export function planPriceView(def: PricingPlanDef, period: PricingBillingPeriod): PricingPriceView | null {
    if (def.priceOnRequest) {
        return { amount: 'İletişime geçin', unit: null };
    }

    const amount = period === 'yearly' ? def.yearlyPriceTry : def.monthlyPriceTry;

    return amount == null ? null : { amount: formatTry(amount), unit: period === 'yearly' ? '/ yıl' : '/ ay' };
}

const MONTH_WORDS: Readonly<Record<number, string>> = { 1: 'bir', 2: 'iki', 3: 'üç', 4: 'dört' };

/** Yıllık ödemede hediye ay sayısı (12 × aylık − yıllık) / aylık; fiyatı olan paketlerden. `9.990 / 999` → 2. */
export function yearlyFreeMonths(plans: readonly PricingPlanDef[] = PRICING_PLAN_DEFS): number | null {
    const priced = plans.find((p) => p.monthlyPriceTry && p.yearlyPriceTry);

    return priced ? Math.round(12 - priced.yearlyPriceTry! / priced.monthlyPriceTry!) : null;
}

/** "Yıllık ödemede iki ay hediye" — sayı veriden. */
export function yearlyOfferText(plans: readonly PricingPlanDef[] = PRICING_PLAN_DEFS): string | null {
    const months = yearlyFreeMonths(plans);

    return months && months > 0 ? `Yıllık ödemede ${MONTH_WORDS[months] ?? months} ay hediye` : null;
}

/** "Fiyatlar KDV hariç; yıllık ödemede iki ay hediye" — veriden. */
export function pricingTermsText(plans: readonly PricingPlanDef[] = PRICING_PLAN_DEFS): string {
    const offer = yearlyOfferText(plans);

    return `Fiyatlar ${PRICING_VAT_NOTE}${offer ? `; ${offer.toLocaleLowerCase('tr-TR')}` : ''}`;
}

/** "Temel aylık ₺999, Profesyonel aylık ₺1.990; Kurumsal için bize ulaşın" — SSS ve ana sayfa için, veriden. */
export function pricingSummaryText(plans: readonly PricingPlanDef[] = PRICING_PLAN_DEFS): string {
    const priced = plans.filter((p) => p.monthlyPriceTry != null).map((p) => `${p.title} aylık ${formatTry(p.monthlyPriceTry!)}`);
    const onRequest = plans.filter((p) => p.priceOnRequest).map((p) => p.title);

    return [priced.join(', '), onRequest.length ? `${onRequest.join(', ')} için bize ulaşın` : ''].filter(Boolean).join('; ');
}

/** "Temel yıllık ₺9.990, Profesyonel yıllık ₺19.900" — veriden. */
export function yearlyPricingText(plans: readonly PricingPlanDef[] = PRICING_PLAN_DEFS): string {
    return plans
        .filter((p) => p.yearlyPriceTry != null)
        .map((p) => `${p.title} yıllık ${formatTry(p.yearlyPriceTry!)}`)
        .join(', ');
}

/** Karşılaştırma tablosuna girecek satırlar: en az bir hücresi dolu olanlar. */
export function decidedFeatureRows(rows: readonly PricingFeatureRowDef[] = PRICING_FEATURE_ROWS): readonly PricingFeatureRowDef[] {
    return rows.filter((row) => Object.values(row.plans).some((cell) => cell !== null));
}

/** Karşılaştırma tablosu çizilecek mi: en az bir sınır ya da doldurulmuş özellik satırı var. */
export function hasPlanComparison(plans: readonly PricingPlanDef[] = PRICING_PLAN_DEFS, rows: readonly PricingFeatureRowDef[] = PRICING_FEATURE_ROWS): boolean {
    return decidedFeatureRows(rows).length > 0 || plans.some((p) => p.maxUsers !== null || p.maxClinics !== null);
}

/** Kartta "öne çıkanlar": bu pakette olan ve paketler arasında fark yaratan satırlar (her pakette aynı olan satır değil). */
export function planHighlights(slug: PricingPlanSlug, rows: readonly PricingFeatureRowDef[] = PRICING_FEATURE_ROWS): readonly string[] {
    return decidedFeatureRows(rows)
        .filter((row) => row.plans[slug] !== null && row.plans[slug] !== false && new Set(Object.values(row.plans)).size > 1)
        .map((row) => (typeof row.plans[slug] === 'string' ? `${row.label}: ${row.plans[slug]}` : row.label));
}

/** `/auth/signup` doğrudan açıldığında kullanılan deneme başlangıç paketi. */
export const DEFAULT_SIGNUP_PLAN: PricingPlanDef = PRICING_PLAN_DEFS[0];

const slugToDef = new Map<PricingPlanSlug, PricingPlanDef>(PRICING_PLAN_DEFS.map((d) => [d.slug, d]));

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
