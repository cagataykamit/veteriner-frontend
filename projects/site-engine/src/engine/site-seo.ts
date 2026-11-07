import { PAGE_DEFS, type SiteConfig } from '../model/site.model';
import { conceptByKey } from './site-concepts';
import { safeImageSrc } from './site-links';
import { pageHeading, resolveSitePage } from './site-page-route';
import { buildSiteVm } from './site-vm';
import { stockSharePhoto } from './stock-photos';

/**
 * Arama ve paylaşım çıktılarının tek kaynağı: sihirbazdaki önizleme ile sitenin sunucu çıktısı aynı kuralı kullanır (ADR-045 K12).
 * `origin` şemalı ve kök adrestir ("https://vetinity.com"); siteler `{origin}/k/{adres}` altındadır.
 */
export function seoTitle(config: SiteConfig): string {
    const { name, district, city } = config.content.clinic;

    return config.seo.title.trim() || [name.trim(), [district, city].filter(Boolean).join(', ')].filter(Boolean).join(' | ');
}

/** Klinik yazmadıysa tanıtımı, o da yoksa kliniğe dair iddia içermeyen genel cümle (K14). */
export function seoDescription(config: SiteConfig): string {
    const { name, district, city, intro } = config.content.clinic;
    const place = [district, city].filter(Boolean).join(', ');

    return config.seo.description.trim() || intro.trim() || (name.trim() ? `${name.trim()}${place ? `, ${place}` : ''}: adres, telefon ve çalışma saatleri.` : '');
}

export function siteRootUrl(origin: string, slug: string): string {
    return `${origin.replace(/\/$/, '')}/k/${encodeURIComponent(slug)}`;
}

export interface SitePageHead {
    readonly found: boolean;
    readonly title: string;
    readonly description: string;
    readonly imageSrc: string | null;
    readonly iconSrc: string | null;
}

/** Açık sayfanın başlığı ve açıklaması: alt sayfa kendi başlığını, ana sayfa SEO ayarını kullanır. */
export function sitePageHead(config: SiteConfig, path: string, now: Date = new Date()): SitePageHead {
    const vm = buildSiteVm(config, conceptByKey(config.design.conceptKey).voice, now);
    const page = resolveSitePage(path, vm);
    const heading = pageHeading(page, vm);
    const home = page.kind === 'home';

    return {
        found: page.kind !== 'notfound',
        title: home ? seoTitle(config) || vm.siteName : heading ? `${heading.title} | ${vm.siteName}` : vm.siteName,
        description: (home ? seoDescription(config) : heading?.lead || seoDescription(config)).slice(0, 300),
        imageSrc: safeImageSrc(config.seo.ogImage) ?? vm.heroImage?.src ?? stockSharePhoto(config.design.conceptKey).src,
        iconSrc: safeImageSrc(config.seo.favicon) ?? vm.logo
    };
}

/** Sitede gerçekten açık olan adresler; boş ya da kapatılmış sayfa girmez. */
export function sitePagePaths(config: SiteConfig, now: Date = new Date()): readonly string[] {
    const vm = buildSiteVm(config, conceptByKey(config.design.conceptKey).voice, now);
    const pages = PAGE_DEFS.filter((page) => page.path && vm.pages[page.key]).map((page) => page.path!);
    const services = vm.pages.hizmetDetay ? vm.services.map((service) => `/hizmetler/${service.slug}`) : [];
    const articles = vm.pages.rehber ? vm.articles.map((article) => `/saglik-rehberi/${article.slug}`) : [];

    return ['', ...pages, ...services, ...articles];
}

function escapeXml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function siteSitemapXml(config: SiteConfig, origin: string, lastModifiedUtc?: string | null): string {
    const root = siteRootUrl(origin, config.seo.slug);
    const lastMod = lastModifiedUtc ? `<lastmod>${escapeXml(lastModifiedUtc.slice(0, 10))}</lastmod>` : '';
    const urls = sitePagePaths(config).map((path) => `  <url><loc>${escapeXml(`${root}${path}`)}</loc>${lastMod}</url>`);

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

/** Bir sitenin `robots` dosyası kök adreste durur; site başına harita `{origin}/k/{adres}/sitemap.xml`. */
export function siteRobotsTxt(): string {
    return 'User-agent: *\nAllow: /k/\n';
}

const DAY_SCHEMA = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** `VeterinaryCare` verisi. `<` kaçırılır: metin, içine yazıldığı `<script>` bloğunu kapatamaz. */
export function siteJsonLd(config: SiteConfig, origin: string, pretty = false): string {
    const { clinic } = config.content;
    const url = siteRootUrl(origin, config.seo.slug);

    const data = {
        '@context': 'https://schema.org',
        '@type': 'VeterinaryCare',
        name: clinic.name,
        description: seoDescription(config) || undefined,
        url,
        telephone: clinic.phone || undefined,
        email: clinic.email || undefined,
        address: { '@type': 'PostalAddress', streetAddress: clinic.address || undefined, addressLocality: clinic.district || undefined, addressRegion: clinic.city || undefined, addressCountry: 'TR' },
        openingHoursSpecification: clinic.workingDays
            .filter((day) => !day.isClosed && day.opensAt && day.closesAt)
            .map((day) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: DAY_SCHEMA[day.dayOfWeek], opens: day.opensAt, closes: day.closesAt }))
    };

    return JSON.stringify(data, null, pretty ? 2 : undefined).replace(/</g, '\\u003c');
}
