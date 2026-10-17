/**
 * Paketler — fiyat, sınır ve paket içeriğinin TEK veri kaynağı (tanıtım `/paketler`, kayıt `?plan=`, panel abonelik
 * kartındaki sınır etiketleri). Değeri `null` olan alan kullanıcıdan (ürün sahibi) gelecek veridir: sayfada o alan
 * gösterilmez, yerine yazı konmaz. Veri gelince yalnız bu dosyadaki PRICING_PLAN_DEFS ve PRICING_FEATURE_ROWS düzenlenir.
 */

/** URL query `plan=` değeri (küçük harf). */
export type PricingPlanSlug = 'basic' | 'pro' | 'premium';

/** Backend `planCode` (SubscriptionPlanCatalog). */
export type PricingPlanApiCode = 'Basic' | 'Pro' | 'Premium';

/** Kullanıcı/klinik sınırı: sayı, `'sinirsiz'` ya da `null` (kullanıcıdan gelecek; gösterilmez). */
export type PricingPlanLimit = number | 'sinirsiz' | null;

export interface PricingPlanDef {
    readonly slug: PricingPlanSlug;
    readonly apiCode: PricingPlanApiCode;
    readonly title: string;
    /** Kime göre, tek cümle (kayıt sayfası ve paket kartı). */
    readonly description: string;
    /** Aylık tutar, TL. `null`: kullanıcıdan gelecek; kartta fiyat satırı çıkmaz. */
    readonly monthlyPriceTry: number | null;
    /** Tutarın altındaki kısa not (örn. "KDV hariç, klinik başına"). `null`: gösterilmez. */
    readonly priceNote: string | null;
    readonly maxUsers: PricingPlanLimit;
    readonly maxClinics: PricingPlanLimit;
    /** "Önerilen" etiketi (en çok bir paket). */
    readonly recommended: boolean;
    readonly trialDays: number;
}

/**
 * VERİ GİRİŞİ — paketler. Kullanıcıdan gelecek: `monthlyPriceTry`, `priceNote`, `maxUsers`, `maxClinics`, `recommended`.
 * Kullanıcı sınırının backend karşılığı `SubscriptionPlanCatalog` (WEB-007): değer girilirken ikisi birlikte güncellenir.
 */
export const PRICING_PLAN_DEFS: readonly PricingPlanDef[] = [
    {
        slug: 'basic',
        apiCode: 'Basic',
        title: 'Temel',
        description: 'Tek klinik ve küçük ekip için.',
        monthlyPriceTry: null,
        priceNote: null,
        maxUsers: null,
        maxClinics: null,
        recommended: false,
        trialDays: 14
    },
    {
        slug: 'pro',
        apiCode: 'Pro',
        title: 'Pro',
        description: 'Birkaç kullanıcıyla çalışan, büyüyen klinikler için.',
        monthlyPriceTry: null,
        priceNote: null,
        maxUsers: null,
        maxClinics: null,
        recommended: false,
        trialDays: 14
    },
    {
        slug: 'premium',
        apiCode: 'Premium',
        title: 'Premium',
        description: 'Birden fazla şubesi olan işletmeler için.',
        monthlyPriceTry: null,
        priceNote: null,
        maxUsers: null,
        maxClinics: null,
        recommended: false,
        trialDays: 14
    }
];

/** Karşılaştırma hücresi: `true` var, `false` yok, metin kısa değer (örn. "E-posta"); `null` kullanıcıdan gelecek. */
export type PricingFeatureCell = boolean | string | null;

export interface PricingFeatureRowDef {
    readonly group: string;
    /** Doğrulanmış ürün yeteneği (research/tanitim-sitesi-analizi-2026-10.md bölüm 4, "Söylenebilir"). */
    readonly label: string;
    readonly plans: Readonly<Record<PricingPlanSlug, PricingFeatureCell>>;
}

const UNDECIDED: Readonly<Record<PricingPlanSlug, PricingFeatureCell>> = { basic: null, pro: null, premium: null };

/**
 * VERİ GİRİŞİ — özellik × paket. Satırlar ürünün doğrulanmış yetenekleridir; hangi pakette olduğu kullanıcıdan gelecek
 * (`plans`). Hücrelerinden en az biri dolu olan satır karşılaştırma tablosunda görünür; hiçbiri dolu değilse tablo
 * yerine paketten bağımsız "Vetinity ile neler yapabilirsiniz" listesi gösterilir.
 */
export const PRICING_FEATURE_ROWS: readonly PricingFeatureRowDef[] = [
    { group: 'Günlük iş', label: 'Bugün ekranı: geliş, bekleme sırası, acil ve uyarılar', plans: UNDECIDED },
    { group: 'Günlük iş', label: 'Randevu ve takvim', plans: UNDECIDED },
    { group: 'Günlük iş', label: 'Muayene: şablon, sözlük, kesinleştirme ve ek not', plans: UNDECIDED },
    { group: 'Günlük iş', label: 'Hasta kartı, zaman çizelgesi ve kilo geçmişi', plans: UNDECIDED },
    { group: 'Günlük iş', label: 'Reçete, aşı ve tedavi kayıtları', plans: UNDECIDED },
    { group: 'Günlük iş', label: 'Laboratuvar istem ve sonuç takibi', plans: UNDECIDED },
    { group: 'Günlük iş', label: 'Yatış takibi', plans: UNDECIDED },
    { group: 'Günlük iş', label: 'Aşı ve randevu hatırlatması (e-posta)', plans: UNDECIDED },
    { group: 'Tahsilat ve stok', label: 'Tahsilat, kısmi ödeme, bakiye ve borç raporu', plans: UNDECIDED },
    { group: 'Tahsilat ve stok', label: 'Doğrudan satış ve gün sonu raporu', plans: UNDECIDED },
    { group: 'Tahsilat ve stok', label: 'Stok, parti ve son kullanma tarihi, mal kabul', plans: UNDECIDED },
    { group: 'Kayıt ve KVKK', label: 'Kayıt defterleri: muayene, reçete, aşı, ilaç, narkotik ve psikotropik', plans: UNDECIDED },
    { group: 'Kayıt ve KVKK', label: 'Aşı Bilgi raporu; yazdırma, Excel ve CSV', plans: UNDECIDED },
    { group: 'Kayıt ve KVKK', label: 'KVKK aydınlatma ve açık rıza formları, rıza kaydı, veri kopyası', plans: UNDECIDED },
    { group: 'Yönetim', label: 'Roller, izinler ve denetim izi', plans: UNDECIDED },
    { group: 'Yönetim', label: 'Rapor merkezi ve genel arama', plans: UNDECIDED },
    { group: 'Yönetim', label: 'Birden fazla klinik (tek kurum)', plans: UNDECIDED },
    { group: 'Yönetim', label: 'Excel ile eski programdan geçiş', plans: UNDECIDED }
];

/** Bugün olmayanlar (ADR-034 karar 6): dürüst "yok" listesi, paketten bağımsız. */
export const PRICING_NOT_AVAILABLE: readonly string[] = [
    'SMS hatırlatma (hatırlatmalar e-posta ile)',
    'e-Fatura',
    'Online randevu',
    'Hasta sahibi portalı ve mobil uygulama (geliştiriliyor)'
];

/** `1500` → "₺1.500"; `null` → `null`. */
export function formatPlanPrice(amount: number | null): string | null {
    if (amount == null) {
        return null;
    }

    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);
}

/** `5, 'kullanıcı'` → "5 kullanıcı"; `'sinirsiz'` → "Sınırsız kullanıcı"; `null` → `null`. */
export function formatPlanLimit(limit: PricingPlanLimit, unit: string): string | null {
    if (limit == null) {
        return null;
    }

    return limit === 'sinirsiz' ? `Sınırsız ${unit}` : `${limit} ${unit}`;
}

/** Karşılaştırma tablosuna girecek satırlar: en az bir hücresi dolu olanlar. */
export function decidedFeatureRows(rows: readonly PricingFeatureRowDef[] = PRICING_FEATURE_ROWS): readonly PricingFeatureRowDef[] {
    return rows.filter((row) => Object.values(row.plans).some((cell) => cell !== null));
}

/** Karşılaştırma tablosu çizilecek mi: en az bir sınır ya da doldurulmuş özellik satırı var. */
export function hasPlanComparison(plans: readonly PricingPlanDef[] = PRICING_PLAN_DEFS, rows: readonly PricingFeatureRowDef[] = PRICING_FEATURE_ROWS): boolean {
    return decidedFeatureRows(rows).length > 0 || plans.some((p) => p.maxUsers !== null || p.maxClinics !== null);
}

/** Kartta "öne çıkanlar": bu pakette olup her pakette olmayan (fark yaratan) satırlar. */
export function planHighlights(slug: PricingPlanSlug, rows: readonly PricingFeatureRowDef[] = PRICING_FEATURE_ROWS): readonly string[] {
    return decidedFeatureRows(rows)
        .filter((row) => row.plans[slug] !== null && row.plans[slug] !== false && !Object.values(row.plans).every((cell) => cell === true))
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
