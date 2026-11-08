import type { HomeSectionType, SiteClinic, SiteConfig, SiteContent, SiteCopy, SiteDesign, SiteSeo, SiteStructure, WorkingDay } from '../model/site.model';
import { conceptByKey, designFromConcept, SITE_CONCEPTS } from './site-concepts';

/**
 * Backend'e yazılan yapılandırma ile motorun çizdiği yapılandırma arasındaki tek köprü (ADR-045 K8). Ad, il, ilçe, adres, telefon,
 * e-posta ve saatler klinik kaydındadır, adres sitenin kaydındadır: saklanan yapılandırmada bulunamaz (backend 400 `clinicRecordField`).
 * Çizimden önce `composeSiteConfig` ile birleştirilir; panel önizlemesi ve site uygulaması aynı yoldan geçer.
 */
export const SITE_SCHEMA_VERSION = 1;

export type SiteClinicRecord = Pick<SiteClinic, 'name' | 'city' | 'district' | 'address' | 'phone' | 'email' | 'workingDays' | 'bookingUrl' | 'nextSlots'>;

export type StoredSiteClinic = Omit<SiteClinic, keyof SiteClinicRecord>;

export interface StoredSiteConfig {
    readonly schemaVersion: number;
    readonly content: Omit<SiteContent, 'clinic'> & { readonly clinic: StoredSiteClinic };
    readonly design: SiteDesign;
    readonly structure: SiteStructure;
    readonly seo: Omit<SiteSeo, 'slug'>;
    readonly publish: SiteConfig['publish'];
}

export const EMPTY_SITE_COPY: SiteCopy = {
    heroEyebrow: '',
    heroTitle: '',
    heroText: '',
    ctaPrimary: '',
    ctaSecondary: '',
    aboutTitle: '',
    aboutText: '',
    servicesTitle: '',
    servicesIntro: '',
    teamTitle: '',
    teamIntro: '',
    featuresTitle: '',
    galleryTitle: '',
    guideTitle: '',
    contactTitle: '',
    contactText: ''
};

const HOME_ORDER: readonly HomeSectionType[] = ['about', 'services', 'team', 'features', 'gallery', 'guide', 'contact'];

const DEFAULT_STRUCTURE: SiteStructure = {
    pages: { hakkimizda: true, hekimler: true, hizmetler: true, hizmetDetay: true, rehber: true, galeri: true, iletisim: true, acil: false, sss: false, randevu: false, ekibimiz: false, subeler: false },
    homeSections: HOME_ORDER.map((type) => ({ type, on: true }))
};

/** Yeni sitenin başlangıcı: içerik boş, boş metinde konseptin genel cümlesi görünür; kliniğe dair hiçbir şey varsayılmaz (K14). */
export function defaultStoredConfig(conceptKey: string = SITE_CONCEPTS[0].key): StoredSiteConfig {
    return {
        schemaVersion: SITE_SCHEMA_VERSION,
        content: {
            clinic: { logo: null, slogan: '', intro: '', whatsapp: '', website: '', mapUrl: '', instagram: '', facebook: '' },
            copy: EMPTY_SITE_COPY,
            heroImage: null,
            aboutImage: null,
            featuresImage: null,
            services: [],
            members: [],
            features: [],
            gallery: [],
            articles: [],
            faqs: [],
            emergencyText: '',
            branches: []
        },
        design: designFromConcept(conceptByKey(conceptKey)),
        structure: DEFAULT_STRUCTURE,
        seo: { title: '', description: '', ogImage: null, favicon: null },
        publish: { siteName: '' }
    };
}

function asRecord(value: unknown): Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/**
 * Sunucudan gelen JSON'u güvenle okur: backend tasarım alanlarını yorumlamadığı için eksik ya da eski parça olabilir; eksik parça
 * varsayılana döner, site bozuk çizilmez. Klinik kaydı alanı gelse de düşer.
 */
export function readStoredConfig(raw: unknown): StoredSiteConfig {
    const source = asRecord(raw);
    const fallback = defaultStoredConfig();
    const content = asRecord(source['content']);
    const clinic = asRecord(content['clinic']);
    const design = asRecord(source['design']);
    const structure = asRecord(source['structure']);
    const { logo, slogan, intro, whatsapp, website, mapUrl, instagram, facebook } = { ...fallback.content.clinic, ...clinic } as StoredSiteClinic;
    const { slug: _slug, ...seo } = { ...fallback.seo, ...asRecord(source['seo']) } as SiteSeo;
    const concept = typeof design['conceptKey'] === 'string' ? designFromConcept(conceptByKey(design['conceptKey'])) : fallback.design;

    return {
        schemaVersion: typeof source['schemaVersion'] === 'number' ? source['schemaVersion'] : SITE_SCHEMA_VERSION,
        content: {
            ...fallback.content,
            ...content,
            clinic: { logo, slogan, intro, whatsapp, website, mapUrl, instagram, facebook },
            copy: { ...EMPTY_SITE_COPY, ...asRecord(content['copy']) }
        } as StoredSiteConfig['content'],
        design: { ...concept, ...design, colors: { ...concept.colors, ...asRecord(design['colors']) }, sections: { ...concept.sections, ...asRecord(design['sections']) } } as SiteDesign,
        structure: {
            pages: { ...fallback.structure.pages, ...asRecord(structure['pages']) },
            homeSections: Array.isArray(structure['homeSections']) ? (structure['homeSections'] as SiteStructure['homeSections']) : fallback.structure.homeSections
        } as SiteStructure,
        seo,
        publish: { ...fallback.publish, ...asRecord(source['publish']) } as SiteConfig['publish']
    };
}

/** Saklanan yapılandırma + klinik kaydı + adres → motorun çizdiği yapılandırma. */
export function composeSiteConfig(stored: StoredSiteConfig, record: SiteClinicRecord, slug: string): SiteConfig {
    const { schemaVersion: _schemaVersion, ...rest } = stored;

    return { ...rest, content: { ...stored.content, clinic: { ...stored.content.clinic, ...record } }, seo: { ...stored.seo, slug } };
}

/** API saatleri "09:00:00" taşır, motor "HH:mm" okur. */
export function toWorkingDays(items: readonly { dayOfWeek: number; isClosed: boolean; opensAt?: string | null; closesAt?: string | null; breakStartsAt?: string | null; breakEndsAt?: string | null }[]): WorkingDay[] {
    const time = (value: string | null | undefined): string | null => (value ? value.slice(0, 5) : null);

    return items.map((item) => ({
        dayOfWeek: item.dayOfWeek,
        isClosed: item.isClosed,
        opensAt: time(item.opensAt),
        closesAt: time(item.closesAt),
        breakStartsAt: time(item.breakStartsAt),
        breakEndsAt: time(item.breakEndsAt)
    }));
}

const SITE_IMAGE_REFERENCE = /^site-image:([0-9a-zA-Z-]+)$/;

export function siteImageReference(id: string): string {
    return `site-image:${id}`;
}

export function siteImageId(value: string | null | undefined): string | null {
    return value?.match(SITE_IMAGE_REFERENCE)?.[1] ?? null;
}

function walkStrings(value: unknown, visit: (text: string) => string): unknown {
    if (typeof value === 'string') return visit(value);

    if (Array.isArray(value)) return value.map((item) => walkStrings(item, visit));

    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, walkStrings(item, visit)]));
    }

    return value;
}

/**
 * `site-image:{id}` başvurularını gerçek adrese çevirir: panelde yetkili içerik ucundan alınan önizleme, sitede herkese açık görsel
 * ucu. Çözülemeyen başvuru boşa düşer; motor boş görseli çizmez.
 */
export function resolveSiteImages<T>(value: T, resolve: (id: string) => string | null): T {
    return walkStrings(value, (text) => {
        const id = siteImageId(text);

        return id ? (resolve(id) ?? '') : text;
    }) as T;
}

/** Yapılandırmanın başvurduğu görsellerin kimlikleri. */
export function usedSiteImageIds(value: unknown): readonly string[] {
    const ids = new Set<string>();

    walkStrings(value, (text) => {
        const id = siteImageId(text);

        if (id) ids.add(id);

        return text;
    });

    return [...ids];
}
