import { Meta, Title } from '@angular/platform-browser';
import { environment } from '@/environments/environment';
import type { PublicFaqDef } from './public-faq-content.utils';
import { PUBLIC_PATHS } from './public-navigation.utils';
import { PRICING_PLAN_DEFS, PRICING_VAT_NOTE, pricingSummaryText, type PricingPlanDef } from './pricing-plan.utils';

/** Canlı tanıtım sitesi kökü; canonical ve OG adresleri buradan türetilir (origin'den değil: staging kendini asıl saymaz). */
export const PUBLIC_SITE_ORIGIN = 'https://www.vetinity.com';

/** OG/Twitter görseli (1200×630, JPEG): gerçek Bugün ekranıyla marka kartı (WEB-005). */
export const PUBLIC_OG_IMAGE_PATH = '/marketing/og-image.jpg';

export interface PublicPageMetaOptions {
    readonly title: string;
    readonly description: string;
    /** Örn. `/` veya `/paketler` — verilirse `link[rel=canonical]` güncellenir. */
    readonly canonicalPath?: string;
    readonly noindex?: boolean;
}

/** Sayfa başına başlık ve açıklama (öneri belgesi 6.2). */
export const PUBLIC_HOME_PAGE_META: PublicPageMetaOptions = {
    title: 'Vetinity — Veteriner klinik programı: günün akışı, kayıt defterleri, KVKK',
    description:
        'Veteriner kliniğinizin gününü tek ekranda yönetin: geliş, muayene, tahsilat, aşı ve ilaç kayıt defterleri, KVKK formları. 14 gün ücretsiz, kart gerekmez.',
    canonicalPath: PUBLIC_PATHS.home
};

export const PUBLIC_FEATURES_PAGE_META: PublicPageMetaOptions = {
    title: 'Özellikler — Gelişten tahsilata bir günün akışı · Vetinity',
    description: "Randevu ve randevusuz geliş, bekleme sırası, muayene, reçete, stok, tahsilat ve gün sonu: Vetinity'de bir ziyaretin yolculuğu.",
    canonicalPath: PUBLIC_PATHS.features
};

export const PUBLIC_REGISTERS_PAGE_META: PublicPageMetaOptions = {
    title: 'Kayıt defterleri ve KVKK — Vetinity',
    description:
        'Aşı, ilaç, narkotik/psikotropik, muayene ve reçete defterleri otomatik; KVKK aydınlatma ve açık rıza formları, rıza kaydı ve veri kopyası.',
    canonicalPath: PUBLIC_PATHS.registersAndKvkk
};

export const PUBLIC_MIGRATION_PAGE_META: PublicPageMetaOptions = {
    title: 'Eski programdan geçiş — Vetinity',
    description: 'Excel veya CSV ile müşteri, hasta ve aşı geçmişinizi aktarın: sütun eşleme, kontrol, geri alma.',
    canonicalPath: PUBLIC_PATHS.migration
};

export const PUBLIC_PACKAGES_PAGE_META: PublicPageMetaOptions = {
    title: 'Paketler ve fiyat — Vetinity',
    description: `Vetinity paketleri: ${pricingSummaryText()} (${PRICING_VAT_NOTE}). Her paketi 14 gün ücretsiz deneyin.`,
    canonicalPath: PUBLIC_PATHS.packages
};

export const PUBLIC_FAQ_PAGE_META: PublicPageMetaOptions = {
    title: 'Sık sorulan sorular — Vetinity',
    description: 'Fiyat, veri güvenliği, geçiş, destek, sözleşme ve deneme hakkında yanıtlar.',
    canonicalPath: PUBLIC_PATHS.faq
};

export const PUBLIC_CONTACT_PAGE_META: PublicPageMetaOptions = {
    title: 'İletişim ve demo talebi — Vetinity',
    description: 'Demo isteyin, paketleri sorun ya da geçiş dosyanıza birlikte bakalım.',
    canonicalPath: PUBLIC_PATHS.contact
};

export const PUBLIC_ABOUT_PAGE_META: PublicPageMetaOptions = {
    title: 'Hakkımızda ve destek — Vetinity',
    description: "Vetinity'yi kim yapıyor, destek kanalı ve hukuki metinler.",
    canonicalPath: PUBLIC_PATHS.about
};

export const AUTH_LOGIN_PAGE_META: PublicPageMetaOptions = {
    title: 'Giriş yap — Vetinity',
    description: 'Vetinity paneline giriş yapın.',
    noindex: true
};

export const AUTH_SIGNUP_PAGE_META: PublicPageMetaOptions = {
    title: 'Hesap oluştur — Vetinity',
    description: 'Veteriner kliniğiniz için ücretsiz deneme hesabı oluşturun.',
    noindex: true
};

/** Mutlak site adresi: `publicSiteUrl('/paketler')` → `https://www.vetinity.com/paketler`. */
export function publicSiteUrl(path: string): string {
    return `${PUBLIC_SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Public sayfa title + temel meta/OG/Twitter tag'lerini günceller; canonical sabit canlı köke işaret eder.
 * Staging derlemesi (`environment.siteNoindex`) her sayfayı `noindex` yapar. Panel route'larında kullanılmaz.
 */
export function setPublicPageMeta(
    title: Title,
    meta: Meta,
    options: PublicPageMetaOptions,
    document?: Document
): void {
    title.setTitle(options.title);

    meta.updateTag({ name: 'description', content: options.description });
    meta.updateTag({ property: 'og:title', content: options.title });
    meta.updateTag({ property: 'og:description', content: options.description });
    meta.updateTag({ property: 'og:type', content: 'website' });
    meta.updateTag({ property: 'og:site_name', content: 'Vetinity' });
    meta.updateTag({ property: 'og:locale', content: 'tr_TR' });
    meta.updateTag({ property: 'og:image', content: publicSiteUrl(PUBLIC_OG_IMAGE_PATH) });
    meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });

    if (options.canonicalPath) {
        meta.updateTag({ property: 'og:url', content: publicSiteUrl(options.canonicalPath) });
    }

    if (options.noindex || environment.siteNoindex) {
        meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    } else {
        meta.removeTag('name="robots"');
    }

    if (options.canonicalPath && document) {
        updateCanonicalLink(document, options.canonicalPath);
    }
}

function updateCanonicalLink(document: Document, path: string): void {
    let link = document.querySelector('link[rel="canonical"]');

    if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
    }

    link.setAttribute('href', publicSiteUrl(path));
}

const JSON_LD_ATTR = 'data-public-json-ld';

/** `<head>` içine kimlikli JSON-LD betiği yazar (aynı kimlik varsa değiştirir). Sayfa ayrılırken `removePublicJsonLd` çağrılır. */
export function setPublicJsonLd(document: Document, id: string, data: Record<string, unknown>): void {
    let script = document.head.querySelector<HTMLScriptElement>(`script[${JSON_LD_ATTR}="${id}"]`);

    if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute(JSON_LD_ATTR, id);
        document.head.appendChild(script);
    }

    script.textContent = JSON.stringify(data);
}

export function removePublicJsonLd(document: Document, id: string): void {
    document.head.querySelector(`script[${JSON_LD_ATTR}="${id}"]`)?.remove();
}

/** schema.org `FAQPage` — ana sayfa SSS'si (öneri belgesi 6.3). */
export function publicFaqPageJsonLd(faqs: readonly PublicFaqDef[]): Record<string, unknown> {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: { '@type': 'Answer', text: faq.answer }
        }))
    };
}

/** schema.org `SoftwareApplication` + paket teklifleri (ADR-035) — paketler sayfası; fiyatlar paket verisinden. */
export function publicPricingJsonLd(plans: readonly PricingPlanDef[] = PRICING_PLAN_DEFS): Record<string, unknown> {
    return {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Vetinity',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: publicSiteUrl(PUBLIC_PATHS.packages),
        offers: plans
            .filter((p) => p.monthlyPriceTry != null)
            .map((p) => ({
                '@type': 'Offer',
                name: p.title,
                price: p.monthlyPriceTry,
                priceCurrency: 'TRY',
                priceSpecification: {
                    '@type': 'UnitPriceSpecification',
                    price: p.monthlyPriceTry,
                    priceCurrency: 'TRY',
                    unitCode: 'MON',
                    valueAddedTaxIncluded: false
                }
            }))
    };
}
