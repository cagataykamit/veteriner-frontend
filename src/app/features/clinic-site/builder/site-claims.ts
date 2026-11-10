import type { CopyKey, SiteArticle, SiteFaq, SiteFeature, SiteMember, SiteService, StoredSiteConfig } from '@site-engine';

/**
 * Serbest metindeki reklam sayılabilecek ifadeler (ADR-045 K14): tek kural burası. Uyarır, engellemez; uymak kliniğin sorumluluğundadır.
 * Türkçe karakter ve büyük harf farkı eşleşmeyi atlatmasın diye metin önce sadeleştirilir.
 */
export interface SiteClaim {
    readonly term: string;
    readonly why: string;
}

const SUPERIORITY = 'Üstünlük ifadesi reklam sayılabilir.';
const OFFER = 'Fiyat, indirim ve avantaj vaadi sitede sunulmamalı.';
const PROMISE = 'Sonuç vaadi tıbbi iddia sayılabilir.';

const RULES: readonly { readonly pattern: RegExp; readonly why: string }[] = [
    { pattern: /\ben (iyi|uygun|ucuz|kaliteli|guvenilir|deneyimli|basarili)\b/g, why: SUPERIORITY },
    { pattern: /\b(1|bir) numara\b|\blider\w*|\brakipsiz\b|\bbirinci\b/g, why: SUPERIORITY },
    { pattern: /\buzman\w*/g, why: 'Belgesi olmayan uzmanlık iddiası sayılabilir; varsa ihtisası açıkça yazın.' },
    { pattern: /\bucretsiz\w*|\bbedava\b|\bhediye\w*/g, why: OFFER },
    { pattern: /\bindirim\w*|\bkampanya\w*|\bfirsat\w*/g, why: OFFER },
    { pattern: /\bfiyat\w*|\bucreti\b|\d+\s*(tl|lira)\b|₺\s*\d+|\d+\s*₺|%\s*\d+|\d+\s*%/g, why: OFFER },
    { pattern: /\bgarantil?\w*/g, why: PROMISE },
    { pattern: /\bkesin (tedavi|cozum|sonuc|iyilesme)\w*/g, why: PROMISE },
    { pattern: /\b7\s*\/\s*24\b|\b24\s*saat\b|\bkesintisiz\b/g, why: 'Doğrulanmamış süreklilik iddiası; gerçek çalışma saatlerini yazın.' }
];

function simplify(text: string): string {
    return text
        .toLocaleLowerCase('tr')
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c');
}

export function findClaims(text: string | null | undefined): readonly SiteClaim[] {
    if (!text?.trim()) return [];

    const simple = simplify(text);
    const found = new Map<string, SiteClaim>();

    for (const rule of RULES) {
        for (const match of simple.matchAll(rule.pattern)) {
            found.set(match[0], { term: match[0], why: rule.why });
        }
    }

    return [...found.values()];
}

export interface DraftClaim extends SiteClaim {
    /** Metnin bulunduğu yer: "Hizmetler: Genel muayene". */
    readonly where: string;
    /** Düzeltileceği adım, 0'dan başlar. */
    readonly step: number;
}

const COPY_WHERE: Readonly<Record<CopyKey, string>> = {
    heroEyebrow: 'Hero üst satırı',
    heroTitle: 'Hero başlığı',
    heroText: 'Hero açıklaması',
    ctaPrimary: 'Ana düğme',
    ctaSecondary: 'İkinci düğme',
    aboutTitle: 'Tanıtım başlığı',
    aboutText: 'Tanıtım metni',
    servicesTitle: 'Hizmetler başlığı',
    servicesIntro: 'Hizmetler açıklaması',
    teamTitle: 'Hekimler başlığı',
    teamIntro: 'Hekimler açıklaması',
    featuresTitle: 'Öne çıkanlar başlığı',
    galleryTitle: 'Galeri başlığı',
    guideTitle: 'Rehber başlığı',
    contactTitle: 'İletişim başlığı',
    contactText: 'İletişim açıklaması'
};

export const COPY_LABELS = COPY_WHERE;

/** Yayın adımı: taslaktaki bütün serbest metinlerin dökümü. */
export function draftClaims(stored: StoredSiteConfig): readonly DraftClaim[] {
    const { content } = stored;
    const items: DraftClaim[] = [];

    const scan = (where: string, step: number, ...texts: readonly string[]): void => {
        const seen = new Set<string>();

        for (const claim of texts.flatMap((text) => findClaims(text))) {
            if (!seen.has(claim.term)) {
                seen.add(claim.term);
                items.push({ ...claim, where, step });
            }
        }
    };

    scan('Slogan ve tanıtım', 0, content.clinic.slogan, content.clinic.intro);
    (Object.keys(COPY_WHERE) as CopyKey[]).forEach((key) => scan(COPY_WHERE[key], 4, content.copy[key]));
    content.services.forEach((service: SiteService) => scan(`Hizmetler: ${service.title || 'adsız'}`, 4, service.title, service.summary, service.body));
    content.members.forEach((member: SiteMember) => scan(`Ekip: ${member.name || 'adsız'}`, 4, member.title, member.specialties, member.bio));
    content.features.forEach((feature: SiteFeature) => scan(`Öne çıkanlar: ${feature.title || 'adsız'}`, 4, feature.title, feature.text));
    content.articles.forEach((article: SiteArticle) => scan(`Rehber: ${article.title || 'adsız'}`, 4, article.title, article.summary, article.body));
    content.faqs.forEach((faq: SiteFaq) => scan('SSS', 4, faq.question, faq.answer));
    scan('Acil durum metni', 4, content.emergencyText);
    scan('SEO', 5, stored.seo.title, stored.seo.description);

    return items;
}
