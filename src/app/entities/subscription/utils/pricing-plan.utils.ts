/**
 * Paketler — paket metni (ad, açıklama, özellik tablosu; ADR-035) ve fiyat görünümü. Tanıtım `/paketler`, ana sayfa, SSS,
 * SEO/JSON-LD, kayıt `?plan=` ve panel abonelik kartı buradan beslenir. Sayılar burada YOK (WEB-007): fiyat, yıllık kural ve
 * kullanıcı sınırı backend'den gelir (`GET /api/v1/public/subscription-plans`, panelde `subscription-summary`); checkout aynı
 * kuraldan çektiği için sitedeki fiyat ile çekilen tutar ayrışmaz. Klinik sınırı backend'de yok, gösterilmez.
 */

/** URL query `plan=` değeri (küçük harf). */
export type PricingPlanSlug = 'basic' | 'pro' | 'premium';

/** Backend `planCode` (SubscriptionPlanCatalog). */
export type PricingPlanApiCode = 'Basic' | 'Pro' | 'Premium';

export interface PricingPlanDef {
    readonly slug: PricingPlanSlug;
    readonly apiCode: PricingPlanApiCode;
    readonly title: string;
    /** Kime göre, tek cümle (kayıt sayfası ve paket kartı). */
    readonly description: string;
    /** "Önerilen" etiketi (en çok bir paket; tasarım belgesi 5.5 orta kart). */
    readonly recommended: boolean;
    readonly trialDays: number;
}

/** Fiyatların vergi notu (ADR-035: KDV hariç; backend `vatIncluded: false`). */
export const PRICING_VAT_NOTE = 'KDV hariç';

/** VERİ — paket metni (ADR-035 tablosu). Fiyat ve sınır backend'den. */
export const PRICING_PLAN_DEFS: readonly PricingPlanDef[] = [
    {
        slug: 'basic',
        apiCode: 'Basic',
        title: 'Temel',
        description: 'Tek başına çalışan hekim için.',
        recommended: false,
        trialDays: 14
    },
    {
        slug: 'pro',
        apiCode: 'Pro',
        title: 'Profesyonel',
        description: 'Birkaç kullanıcıyla çalışan ve hasta sahiplerine portal sunan klinikler için.',
        recommended: true,
        trialDays: 14
    },
    {
        slug: 'premium',
        apiCode: 'Premium',
        title: 'Kurumsal',
        description: 'Birden fazla şubesi olan işletmeler için.',
        recommended: false,
        trialDays: 14
    }
];

/** Backend paket kataloğundan bir paketin sayıları (TL; fiyat yapılandırılmamışsa `null`). */
export interface PricingPlanOffer {
    readonly apiCode: string;
    readonly maxUsers: number | null;
    readonly monthlyPriceTry: number | null;
    readonly yearlyPriceTry: number | null;
}

/** Backend paket kataloğu (`PublicSubscriptionPlanCatalogDto`). */
export interface PricingCatalog {
    readonly vatIncluded: boolean;
    /** Yıllık ödemede ücretlendirilen ay (12 − bu = hediye ay). */
    readonly yearlyBilledMonths: number;
    readonly plans: readonly PricingPlanOffer[];
}

/** Sayfadaki katalog durumu: yükleniyor, geldi ya da alınamadı (alınamazsa tutar yazılmaz, "Fiyat için bize yazın"). */
export type PricingCatalogState = { readonly status: 'loading' } | { readonly status: 'ready'; readonly catalog: PricingCatalog } | { readonly status: 'error' };

/** Katalogda paketin sayıları; paket katalogda yoksa `null`. */
export function catalogOffer(catalog: PricingCatalog, def: PricingPlanDef): PricingPlanOffer | null {
    return catalog.plans.find((p) => p.apiCode.toLowerCase() === def.apiCode.toLowerCase()) ?? null;
}

/** Sayfadaki katalog durumundan paketin sayıları; katalog henüz yoksa ya da alınamadıysa `null`. */
export function planOffer(state: PricingCatalogState, def: PricingPlanDef): PricingPlanOffer | null {
    return state.status === 'ready' ? catalogOffer(state.catalog, def) : null;
}

/** Karşılaştırma hücresi: `true` var, `false` yok, metin kısa değer (örn. "E-posta"); `null` gösterilmez. */
export type PricingFeatureCell = boolean | string | null;

export interface PricingFeatureRowDef {
    readonly group: string;
    readonly label: string;
    /** Satırın altındaki kısa açıklama. */
    readonly detail?: string;
    /** Metinde adıyla anılan satır (SSS çok klinik yanıtı). */
    readonly key?: 'multiClinic';
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
    { group: 'Yönetim', label: 'Çok klinik yönetimi ve klinikler arası yetki', key: 'multiClinic', plans: { basic: false, pro: false, premium: true } },
    {
        group: 'Hasta sahibi',
        label: 'Hasta sahibi portalı',
        detail: 'Aşı, randevu, bakiye; telefonda ana ekrana eklenebilir',
        plans: { basic: false, pro: true, premium: true }
    },
    { group: 'Destek', label: 'Destek', plans: { basic: 'E-posta', pro: 'E-posta, öncelikli', premium: 'Özel iletişim, kurulum desteği' } }
];

/** Özellik satırında "var" olan paketlerin adları ("Kurumsal"); satır yoksa boş. */
export function planTitlesWithFeature(key: NonNullable<PricingFeatureRowDef['key']>, rows: readonly PricingFeatureRowDef[] = PRICING_FEATURE_ROWS): string {
    const row = rows.find((r) => r.key === key);

    return row
        ? PRICING_PLAN_DEFS.filter((d) => row.plans[d.slug] === true)
              .map((d) => d.title)
              .join(', ')
        : '';
}

/** Şu an olmayanlar (ADR-035): dürüst kısa liste, paketten bağımsız; tarih ya da vaat yazılmaz. */
export const PRICING_NOT_AVAILABLE: readonly string[] = ['SMS hatırlatma (hatırlatmalar e-posta ile gider)', 'e-Fatura', 'Online ödeme', 'Online randevu'];

/** Katalog alınamadığında ya da paketin fiyatı yokken tutar yerine yazılan metin (ADR-034); bağlantı iletişime gider. */
export const PRICING_ON_REQUEST_TEXT = 'Fiyat için bize yazın';

const formatTry = (amount: number): string => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(amount);

/** Backend kuruş tutarı → TL (`179000` → `1790`); yoksa ya da geçersizse `null`. */
export function priceMinorToTry(minor: number | null | undefined): number | null {
    return typeof minor === 'number' && Number.isFinite(minor) && minor > 0 ? minor / 100 : null;
}

/** `1790` → "₺1.790"; `null` → `null`. */
export function formatPlanPrice(amount: number | null): string | null {
    return amount == null ? null : formatTry(amount);
}

/** `3` → "3 kullanıcı"; `null` → `null` (gösterilmez). */
export function formatUserLimit(maxUsers: number | null): string | null {
    return maxUsers == null ? null : `${maxUsers} kullanıcı`;
}

/** Ödeme dönemi (BILL-001). */
export type PricingBillingPeriod = 'monthly' | 'yearly';

/** Yıllıkta hediye ay sayısı (12 − ücretlendirilen ay); katalogdan. */
export function yearlyGiftMonths(catalog: PricingCatalog): number {
    return Math.max(0, 12 - catalog.yearlyBilledMonths);
}

/** Vergi notu katalogdan ("KDV hariç" / "KDV dahil"). */
export function pricingVatNote(catalog: PricingCatalog): string {
    return catalog.vatIncluded ? 'KDV dahil' : PRICING_VAT_NOTE;
}

export interface PricingPriceView {
    /** "₺1.790". */
    readonly amount: string;
    /** "/ ay" ya da "/ yıl". */
    readonly unit: string;
    /** Yıllıkta "2 ay hediye · aylık ortalama ₺742"; aylıkta `null`. */
    readonly note: string | null;
}

/** Kart ve tablo için fiyat görünümü (varsayılan aylık); tutar yoksa `null` (sayfa "Fiyat için bize yazın" yazar). */
export function planPriceView(offer: PricingPlanOffer | null, catalog: PricingCatalog | null, period: PricingBillingPeriod = 'monthly'): PricingPriceView | null {
    if (offer == null || catalog == null) {
        return null;
    }

    if (period === 'monthly') {
        return offer.monthlyPriceTry == null ? null : { amount: formatTry(offer.monthlyPriceTry), unit: '/ ay', note: null };
    }

    if (offer.yearlyPriceTry == null) {
        return null;
    }

    const gift = yearlyGiftMonths(catalog);
    const average = `aylık ortalama ${formatTry(Math.round(offer.yearlyPriceTry / 12))}`;

    return { amount: formatTry(offer.yearlyPriceTry), unit: '/ yıl', note: gift > 0 ? `${gift} ay hediye · ${average}` : average };
}

/** "Fiyatlar KDV hariç" — fiyat koşulu notu (ADR-035). */
export function pricingTermsText(): string {
    return `Fiyatlar ${PRICING_VAT_NOTE}`;
}

/** Paket adları ("Temel, Profesyonel ve Kurumsal") — SEO ve SSS metni için; sayı içermez. */
export function planTitlesText(plans: readonly PricingPlanDef[] = PRICING_PLAN_DEFS): string {
    const titles = plans.map((p) => p.title);

    return titles.length > 1 ? `${titles.slice(0, -1).join(', ')} ve ${titles[titles.length - 1]}` : (titles[0] ?? '');
}

/** Karşılaştırma tablosuna girecek satırlar: en az bir hücresi dolu olanlar. */
export function decidedFeatureRows(rows: readonly PricingFeatureRowDef[] = PRICING_FEATURE_ROWS): readonly PricingFeatureRowDef[] {
    return rows.filter((row) => Object.values(row.plans).some((cell) => cell !== null));
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
