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
        description: 'Tek klinik ve küçük ekip için.',
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

/** Metinde adıyla anılan satırlar (SSS, Özellikler kartları): hangi pakette olduğu satırdan okunur, metne kopyalanmaz. */
export type PricingFeatureKey =
    | 'multiClinic'
    | 'clinicSite'
    | 'vetFinder'
    | 'onlineBooking'
    | 'reminderReplies'
    | 'automatedReminders'
    | 'waitlist'
    | 'vaccinationWizard'
    | 'mobileBarcode'
    | 'cashManagement'
    | 'advancedReports'
    | 'clinicsOverview'
    | 'externalApi'
    | 'freeMigrationSupport'
    | 'dataExport';

export interface PricingFeatureRowDef {
    readonly group: string;
    readonly label: string;
    /** Satırın altındaki kısa açıklama. */
    readonly detail?: string;
    readonly key?: PricingFeatureKey;
    readonly plans: Readonly<Record<PricingPlanSlug, PricingFeatureCell>>;
}

const ALL: Readonly<Record<PricingPlanSlug, PricingFeatureCell>> = { basic: true, pro: true, premium: true };
/** Profesyonel ve Kurumsal (portal ve TIER-003…008, 018; ADR-035). */
const PRO_AND_UP: Readonly<Record<PricingPlanSlug, PricingFeatureCell>> = { basic: false, pro: true, premium: true };
const PREMIUM_ONLY: Readonly<Record<PricingPlanSlug, PricingFeatureCell>> = { basic: false, pro: false, premium: true };

/**
 * VERİ — özellik × paket (ADR-035 tablosu ve notları). Yasal kayıt defterleri ve KVKK araçları hiçbir pakette kilitlenmez;
 * fark kullanıcı sayısı ve üst paketlere eklenen işlerdir (Temel kısılmaz). Satır yalnız çalışan ve panelden erişilen özellik
 * için yazılır (kodda doğrulanır, backlog'dan değil). Söylenmeyecek iddialar: ADR-034 karar 6; canlıya çıkışta eklenen
 * satırlar kullanıcı kararı (2026-11-09).
 */
export const PRICING_FEATURE_ROWS: readonly PricingFeatureRowDef[] = [
    { group: 'Klinik', label: 'Bugün ekranı ve geliş takibi', detail: 'Randevulu ve randevusuz geliş, bekleme, acil işareti', plans: ALL },
    { group: 'Klinik', label: 'Randevu listesi ve takvimi', plans: ALL },
    { group: 'Klinik', label: 'Bekleme listesi', detail: 'İptal olan saat için sıradaki uygun kişiye e-postayla teklif', key: 'waitlist', plans: PRO_AND_UP },
    { group: 'Klinik', label: 'Müşteri ve hasta kartı', detail: 'Hastanın geçmişi zaman çizelgesinde', plans: ALL },
    { group: 'Klinik', label: 'Muayene kaydı', detail: 'Kesinleşince kilitlenir; düzeltme gerekçeli ek notla', plans: ALL },
    { group: 'Klinik', label: 'Muayene şablonları ve metin parçaları', detail: 'Tanı ve şikâyet sözlüğüyle', plans: ALL },
    { group: 'Klinik', label: 'Doz hesaplayıcı', detail: 'Kilo ve doz/kg ile toplam doz ve hacim', plans: ALL },
    { group: 'Klinik', label: 'Aşı takibi', plans: ALL },
    { group: 'Klinik', label: 'Otomatik aşı sihirbazı', detail: 'Kliniğinizin aşı takviminden kalan dozlar önerilir; hekim onaylar', key: 'vaccinationWizard', plans: PRO_AND_UP },
    { group: 'Klinik', label: 'Reçete', plans: ALL },
    { group: 'Klinik', label: 'Tedavi ve uygulama kaydı', plans: ALL },
    { group: 'Klinik', label: 'Tedavi paketi', detail: 'Şablondan tek ücretle uygulanır', plans: ALL },
    { group: 'Klinik', label: 'Laboratuvar istemi ve sonucu', plans: ALL },
    { group: 'Klinik', label: 'Görüntüleme kaydı', plans: ALL },
    { group: 'Klinik', label: 'Yatış takibi ve bakım talimatları', plans: ALL },
    {
        group: 'Kayıt ve KVKK',
        label: 'Kayıt defterleri ve Aşı Bilgi Raporu',
        detail: 'Muayene, reçete, aşı, ilaç, narkotik ve psikotropik; yazdırma ve dışa aktarma',
        plans: ALL
    },
    { group: 'Kayıt ve KVKK', label: 'HBS takip listeleri', detail: "HBS'e girilmemiş reçete ve aşılar; giriş klinikçe yapılır", plans: ALL },
    { group: 'Kayıt ve KVKK', label: 'Aydınlatma metni ve açık rıza formu', detail: 'Klinik başına, yazdırılabilir; rıza kaydı ve metin sürümü', plans: ALL },
    { group: 'Kayıt ve KVKK', label: 'Müşteri veri kopyası', plans: ALL },
    { group: 'Kayıt ve KVKK', label: 'Tüm verinizi dışa aktarma', detail: 'Kurumun tüm kayıtları tek ZIP paketinde, her tablo ayrı CSV', key: 'dataExport', plans: ALL },
    { group: 'Para ve stok', label: 'Ücret ve tahsilat', detail: 'Nakit, kart ya da havale kaydı', plans: ALL },
    { group: 'Para ve stok', label: 'Ücret bekleyen kalemler', plans: ALL },
    { group: 'Para ve stok', label: 'Bakiye, borç raporu ve müşteri kredisi', plans: ALL },
    { group: 'Para ve stok', label: 'Gün sonu raporu', plans: ALL },
    {
        group: 'Para ve stok',
        label: 'Çoklu kasa ve kasa yönetimi',
        detail: 'Kasa giriş ve çıkışı, kasalar arası aktarım, kasa bazında sayım ve rapor',
        key: 'cashManagement',
        plans: PRO_AND_UP
    },
    { group: 'Para ve stok', label: 'Ürün ve stok takibi', detail: 'Düşük ve süresi geçmiş stok görünür', plans: ALL },
    { group: 'Para ve stok', label: 'Mal kabul, parti ve son kullanma tarihi', plans: ALL },
    { group: 'Para ve stok', label: 'Kamerayla barkod okutma', detail: 'Telefon kamerasıyla mal kabulde, satışta ve ürün aramasında', key: 'mobileBarcode', plans: PRO_AND_UP },
    { group: 'Para ve stok', label: 'Muayenesiz doğrudan satış', plans: ALL },
    { group: 'Web sitesi ve randevu', label: 'Klinik web sitesi', detail: 'Sihirbazla çok sayfalı site; yayından önce önizleme', key: 'clinicSite', plans: ALL },
    { group: 'Web sitesi ve randevu', label: "Veteriner bul'da listelenme", detail: 'İl ve ilçeye göre; isteğe bağlı ve ücretsiz', key: 'vetFinder', plans: ALL },
    {
        group: 'Web sitesi ve randevu',
        label: 'Online randevu ve en yakın müsait saat',
        detail: 'Sitenizden ve kliniğe özel bağlantıdan talep; onayı klinik verir',
        key: 'onlineBooking',
        plans: ALL
    },
    { group: 'Hasta sahibi', label: 'E-posta ile aşı ve randevu hatırlatması', plans: ALL },
    { group: 'Hasta sahibi', label: 'Hatırlatmada onayla / iptal et, takvime ekle', detail: 'Hasta sahibi e-postadaki bağlantıyla yanıtlar', key: 'reminderReplies', plans: ALL },
    {
        group: 'Hasta sahibi',
        label: 'Otomatik hatırlatıcılar',
        detail: 'Kontrol, borç ve uzun süredir gelmeyen hasta için e-posta. Sonuncusu ticari iletidir: kliniğin İYS kaydı ve hasta sahibinin onayı gerekir',
        key: 'automatedReminders',
        plans: PRO_AND_UP
    },
    { group: 'Hasta sahibi', label: 'Hasta sahibi portalı', detail: 'Aşı, randevu, bakiye, veri talebi; telefonda ana ekrana eklenebilir', plans: PRO_AND_UP },
    { group: 'Hasta sahibi', label: 'Portaldan randevu talebi', detail: 'Kendi hayvanını seçerek', plans: PRO_AND_UP },
    { group: 'Yönetim', label: 'Raporlar', detail: 'Randevu, muayene, aşı, ödeme, borç ve işletme performansı', plans: ALL },
    { group: 'Yönetim', label: 'Gelişmiş raporlar', detail: 'Hekim, hizmet ve tür kırılımları; önceki dönemle', key: 'advancedReports', plans: PRO_AND_UP },
    { group: 'Yönetim', label: 'Şubeler özeti', detail: 'Tüm şubelerin ciro, tahsilat ve iş yükü tek tabloda', key: 'clinicsOverview', plans: PREMIUM_ONLY },
    { group: 'Yönetim', label: 'Eski sistemden veri aktarımı', detail: 'Excel veya CSV ile müşteri, hasta ve aşı kayıtları', plans: ALL },
    { group: 'Yönetim', label: 'Rol bazlı yetki', plans: ALL },
    { group: 'Yönetim', label: 'Denetim kaydı', detail: 'Kayıt geçmişi: kim, ne zaman', plans: ALL },
    { group: 'Yönetim', label: 'Çok klinik yönetimi ve klinikler arası yetki', key: 'multiClinic', plans: PREMIUM_ONLY },
    { group: 'Yönetim', label: 'API erişimi', detail: 'Müşteri, hasta, randevu ve aşı listeleri salt okunur', key: 'externalApi', plans: PREMIUM_ONLY },
    { group: 'Destek', label: 'Destek', plans: { basic: 'E-posta', pro: 'E-posta, öncelikli', premium: 'Özel iletişim, kurulum desteği' } },
    {
        group: 'Destek',
        label: 'Ücretsiz geçiş desteği',
        detail: 'Veri aktarımında yardım ve 1 saatlik kurulum görüşmesi; diğer paketlerde ücretli',
        key: 'freeMigrationSupport',
        plans: PREMIUM_ONLY
    },
    { group: 'Destek', label: 'Size özel geliştirmeler', detail: 'İş akışınıza göre ekran, rapor ve çıktı düzenlemeleri; Vetinity içinde', plans: PREMIUM_ONLY }
];

/** Özellik satırında "var" olan paketlerin adları ("Kurumsal"); satır yoksa boş. */
export function planTitlesWithFeature(key: PricingFeatureKey, rows: readonly PricingFeatureRowDef[] = PRICING_FEATURE_ROWS): string {
    const row = rows.find((r) => r.key === key);

    return row
        ? PRICING_PLAN_DEFS.filter((d) => row.plans[d.slug] === true)
              .map((d) => d.title)
              .join(', ')
        : '';
}

/** Satırın paketleri kısa: "Tüm paketlerde", "Profesyonel ve Kurumsal paketlerinde", "Kurumsal paketinde"; satır yoksa boş. */
export function planAvailabilityText(key: PricingFeatureKey, rows: readonly PricingFeatureRowDef[] = PRICING_FEATURE_ROWS): string {
    const row = rows.find((r) => r.key === key);
    const plans = row ? PRICING_PLAN_DEFS.filter((d) => row.plans[d.slug] === true) : [];

    if (plans.length === 0) {
        return '';
    }

    return plans.length === PRICING_PLAN_DEFS.length ? 'Tüm paketlerde' : plansFromText(plans[0].apiCode);
}

/** Verilen paket ve üstündekiler cümle içinde: `Pro` → "Profesyonel ve Kurumsal paketlerinde", `Premium` → "Kurumsal paketinde"; bilinmeyen kodda boş. */
export function plansFromText(apiCode: string): string {
    const index = PRICING_PLAN_DEFS.findIndex((d) => d.apiCode.toLowerCase() === apiCode.trim().toLowerCase());

    if (index < 0) {
        return '';
    }

    const titles = PRICING_PLAN_DEFS.slice(index).map((d) => d.title);

    return titles.length === 1 ? `${titles[0]} paketinde` : `${titles.slice(0, -1).join(', ')} ve ${titles[titles.length - 1]} paketlerinde`;
}

/** Şu an olmayanlar (ADR-035): dürüst kısa liste, paketten bağımsız; tarih ya da vaat yazılmaz. */
export const PRICING_NOT_AVAILABLE: readonly string[] = [
    'SMS hatırlatma (hatırlatmalar e-posta ile gider)',
    'e-Fatura',
    'Online ödeme',
    'Ayrı telefon uygulaması (panel tarayıcıda, telefonda da çalışır)',
    "HBS'e otomatik gönderim (takip listesi var, giriş klinikçe yapılır)",
    'Yapay zekâ özellikleri'
];

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
