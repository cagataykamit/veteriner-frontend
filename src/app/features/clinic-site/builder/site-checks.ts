import { buildSiteTokens, contrast, type CopyKey, seoDescription, seoTitle, type SiteConfig, type StoredSiteConfig } from '@site-engine';
import { COPY_LABELS } from '@/app/features/clinic-site/builder/site-claims';

/** Hesaplanan kontroller: yapılandırmadan ya da önizlemenin gerçek DOM'undan. Yeşil, yalnız ölçülen şey için yeşildir. */
export interface SiteCheck {
    readonly label: string;
    readonly ok: boolean;
    readonly detail: string;
}

export interface MissingItem {
    readonly text: string;
    /** Düzeltileceği adım, 0'dan başlar. */
    readonly step: number;
}

export function isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function phoneError(value: string): string | null {
    const digits = value.replace(/\D/g, '');

    return digits.length >= 10 && digits.length <= 12 ? null : 'Telefon 10–12 rakam olmalı.';
}

/** Sözleşme §4: 3–60 karakter, küçük harf, rakam ve tek tire; başta ve sonda tire yok. Ayrılmış sözcükleri backend söyler. */
export function isSlug(value: string): boolean {
    return value.length >= 3 && value.length <= 60 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
}

export function seoChecks(config: SiteConfig): readonly SiteCheck[] {
    const title = seoTitle(config);
    const description = seoDescription(config);

    return [
        { label: 'SEO başlığı', ok: title.length >= 10 && title.length <= 60, detail: `${title.length} karakter (10–60 önerilir).` },
        { label: 'Meta açıklama', ok: description.length >= 50 && description.length <= 160, detail: `${description.length} karakter (50–160 önerilir).` },
        { label: 'Paylaşım görseli', ok: true, detail: config.seo.ogImage ? 'Yüklendi.' : config.content.heroImage ? 'Hero fotoğrafı kullanılır.' : 'Hazır fotoğraf kullanılır.' },
        { label: 'Site simgesi (favicon)', ok: !!config.seo.favicon || !!config.content.clinic.logo, detail: config.seo.favicon ? 'Yüklendi.' : config.content.clinic.logo ? 'Logo kullanılır.' : 'Yüklenmedi.' }
    ];
}

export function contrastChecks(config: SiteConfig): readonly SiteCheck[] {
    const tokens = buildSiteTokens(config.design) as Readonly<Record<string, string>>;

    const pair = (label: string, a: string, b: string): SiteCheck => {
        const ratio = contrast(tokens[a], tokens[b]);

        return { label, ok: ratio >= 4.5, detail: `${ratio.toFixed(1)}:1` };
    };

    return [pair('Metin / zemin', '--s-ink', '--s-bg'), pair('Soluk metin / yüzey', '--s-muted', '--s-surface'), pair('Ana renk metni / yüzey', '--s-primary-text', '--s-surface'), pair('Düğme metni / ana renk', '--s-on-primary', '--s-primary'), pair('Bant metni / bant', '--s-on-band', '--s-band')];
}

export function imageChecks(config: SiteConfig): readonly SiteCheck[] {
    const { gallery } = config.content;
    const noAlt = gallery.filter((item) => !item.alt.trim()).length;

    return [{ label: 'Galeri alt metinleri', ok: noAlt === 0, detail: noAlt ? `${noAlt} fotoğrafın alt metni boş.` : gallery.length ? `${gallery.length} fotoğrafın hepsinde var.` : 'Hazır fotoğrafların alt metni var.' }];
}

/** Önizlemedeki açık sayfayı gerçekten ölçer: taşma, başlık sayısı, alt metin, dokunma hedefi. */
export function auditPreview(root: HTMLElement): readonly SiteCheck[] {
    const site = root.querySelector<HTMLElement>('.site');

    if (!site) return [];

    const overflow = site.scrollWidth - site.clientWidth;
    const headings = site.querySelectorAll('h1').length;
    const images = [...site.querySelectorAll('img')].filter((image) => !image.hasAttribute('alt')).length;
    const targets = [...site.querySelectorAll<HTMLElement>('a, button, summary')].filter((element) => element.offsetParent !== null);
    const small = targets.filter((element) => element.offsetHeight < 44 && element.offsetWidth < 44).length;
    const short = targets.filter((element) => element.offsetHeight < 44 && element.offsetWidth >= 44 && getComputedStyle(element).display !== 'inline').length;

    return [
        { label: 'Yatay taşma', ok: overflow <= 0, detail: overflow > 0 ? `${overflow} px taşıyor.` : 'Taşma yok.' },
        { label: 'Tek ana başlık', ok: headings === 1, detail: `${headings} adet h1.` },
        { label: 'Görsel alt niteliği', ok: images === 0, detail: images ? `${images} görselde alt yok.` : 'Hepsinde var.' },
        { label: 'Dokunma hedefi (44 px)', ok: small + short === 0, detail: small + short ? `${targets.length} bağlantı ve düğmeden ${small + short} tanesi kısa.` : `${targets.length} bağlantı ve düğme ölçüldü.` }
    ];
}

/** K9: zorunlu liste backend'dedir (`missingForPublish`); bunlar engel olmayan uyarılardır. */
export function publishWarnings(config: SiteConfig): readonly MissingItem[] {
    const { clinic, services, members, heroImage, aboutImage } = config.content;
    const items: MissingItem[] = [];

    if (!clinic.logo) items.push({ text: 'Logo yüklenmedi; baş harf çiziliyor.', step: 0 });
    if (!clinic.email.trim()) items.push({ text: 'E-posta yok.', step: 0 });
    if (!services.length) items.push({ text: 'Hizmet eklenmedi.', step: 4 });
    if (!members.some((member) => member.kind === 'hekim' && member.name.trim())) items.push({ text: 'Hekim eklenmedi.', step: 4 });
    if (!heroImage || !aboutImage) items.push({ text: 'Hazır fotoğraflar görünüyor; dilerseniz kendi fotoğrafınızı yükleyin.', step: 4 });

    return items;
}

const SHOWN_COPY: readonly CopyKey[] = ['heroTitle', 'heroText', 'ctaPrimary', 'aboutText', 'servicesIntro', 'teamIntro', 'contactText'];

/** Klinik yazmadığı için konseptin genel cümlesiyle görünen metinler (K14). */
export function defaultCopyLabels(stored: StoredSiteConfig): readonly string[] {
    return SHOWN_COPY.filter((key) => !stored.content.copy[key].trim()).map((key) => COPY_LABELS[key]);
}

/** Bağlantı alanına yapıştırılan görünmez biçim karakterleri atılır; kalsa backend reddeder, klinik sebebini göremez. */
export function cleanLinkInput(text: string): string {
    return text.replace(/\p{Cf}/gu, '');
}

export function slugify(text: string): string {
    return text
        .toLocaleLowerCase('tr')
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

export function uniqueSlug(base: string, taken: readonly string[]): string {
    let slug = base;

    for (let suffix = 2; taken.includes(slug); suffix++) slug = `${base}-${suffix}`;

    return slug;
}
