/**
 * Klinik web sitesinin veri modeli. Klinik başına bir aktif site vardır (`SiteDocument`): üzerinde çalışılan taslak,
 * yayındaki sürüm ve sürüm geçmişi. İçerik (`SiteContent`) ile tasarım (`SiteDesign`) ayrıdır: tasarım değişince metin ve
 * fotoğraf aynı kalır. Render motoru yalnız `SiteConfig` görür; sihirbazdan haberi yoktur.
 */
export type SectionType = 'nav' | 'hero' | 'about' | 'services' | 'team' | 'features' | 'gallery' | 'guide' | 'contact' | 'footer';

/** Ana sayfada açılıp kapanan ve sırası değişen bölümler. Navigasyon, hero ve footer sabit yerindedir. */
export type HomeSectionType = Exclude<SectionType, 'nav' | 'hero' | 'footer'>;

export type PageKey = 'hakkimizda' | 'hekimler' | 'hizmetler' | 'hizmetDetay' | 'rehber' | 'galeri' | 'iletisim' | 'acil' | 'sss' | 'randevu' | 'ekibimiz' | 'subeler';

export type CopyKey =
    | 'heroEyebrow'
    | 'heroTitle'
    | 'heroText'
    | 'ctaPrimary'
    | 'ctaSecondary'
    | 'aboutTitle'
    | 'aboutText'
    | 'servicesTitle'
    | 'servicesIntro'
    | 'teamTitle'
    | 'teamIntro'
    | 'featuresTitle'
    | 'galleryTitle'
    | 'guideTitle'
    | 'contactTitle'
    | 'contactText';

export type SiteCopy = Readonly<Record<CopyKey, string>>;

export interface SiteImage {
    readonly src: string;
    readonly alt: string;
}

export interface SiteService {
    readonly slug: string;
    readonly title: string;
    readonly summary: string;
    /** Boş satırla paragraflara ayrılır. */
    readonly body: string;
    readonly image: SiteImage | null;
}

export type MemberKind = 'hekim' | 'ekip';

export interface SiteMember {
    readonly slug: string;
    readonly kind: MemberKind;
    readonly name: string;
    readonly title: string;
    readonly specialties: string;
    readonly bio: string;
    /** Yoksa monogram çizilir. */
    readonly image: SiteImage | null;
}

export interface SiteFeature {
    readonly title: string;
    readonly text: string;
}

export interface SiteArticle {
    readonly slug: string;
    readonly category: string;
    readonly title: string;
    readonly summary: string;
    readonly body: string;
    readonly minutes: number;
    readonly image: SiteImage | null;
}

export interface SiteFaq {
    readonly question: string;
    readonly answer: string;
}

export interface SiteBranch {
    readonly name: string;
    readonly address: string;
    readonly phone: string;
}

/** `dayOfWeek`: 0 pazar, 6 cumartesi. Saatler "HH:mm". */
export interface WorkingDay {
    readonly dayOfWeek: number;
    readonly isClosed: boolean;
    readonly opensAt: string | null;
    readonly closesAt: string | null;
    readonly breakStartsAt: string | null;
    readonly breakEndsAt: string | null;
}

export interface SiteClinic {
    readonly name: string;
    readonly logo: string | null;
    readonly slogan: string;
    readonly intro: string;
    readonly phone: string;
    readonly whatsapp: string;
    readonly email: string;
    readonly website: string;
    readonly address: string;
    readonly district: string;
    readonly city: string;
    readonly mapUrl: string;
    readonly instagram: string;
    readonly facebook: string;
    readonly workingDays: readonly WorkingDay[];
    /** Online randevu açıksa kliniğin talep formu (ADR-045 K11). Çalışma anında gelir, yapılandırmada saklanmaz. */
    readonly bookingUrl: string | null;
    /** En yakın müsait saatler (TIER-017). Çalışma anında gelir, yapılandırmada saklanmaz; boşsa gösterim yoktur. */
    readonly nextSlots: readonly SiteSlot[];
}

/** Herkese açık en yakın saat: İstanbul takvim günü (`yyyy-MM-dd`) ve başlangıç (UTC ISO). Hekim ve süre yoktur. */
export interface SiteSlot {
    readonly date: string;
    readonly startUtc: string;
}

export interface SiteContent {
    readonly clinic: SiteClinic;
    /** Boş bırakılan metinde seçili konseptin önerdiği cümle kullanılır. */
    readonly copy: SiteCopy;
    readonly heroImage: SiteImage | null;
    readonly aboutImage: SiteImage | null;
    readonly featuresImage: SiteImage | null;
    readonly services: readonly SiteService[];
    readonly members: readonly SiteMember[];
    readonly features: readonly SiteFeature[];
    readonly gallery: readonly SiteImage[];
    readonly articles: readonly SiteArticle[];
    readonly faqs: readonly SiteFaq[];
    readonly emergencyText: string;
    readonly branches: readonly SiteBranch[];
}

export type RadiusKey = 'keskin' | 'yumusak' | 'yuvarlak';
export type GroundKey = 'beyaz' | 'kagit' | 'krem' | 'adacayi' | 'gece';
export type LogoPlacement = 'sol' | 'orta';
export type CharacterKey = 'sade' | 'zarif' | 'samimi' | 'dogal';

export interface SiteColors {
    readonly primary: string;
    readonly secondary: string;
    readonly accent: string;
}

export interface SiteDesign {
    readonly conceptKey: string;
    readonly colors: SiteColors;
    readonly ground: GroundKey;
    readonly headFont: string;
    readonly bodyFont: string;
    readonly radius: RadiusKey;
    readonly logoPlacement: LogoPlacement;
    readonly character: CharacterKey;
    /** Bölüm türü başına seçili alternatifin anahtarı. */
    readonly sections: Readonly<Record<SectionType, string>>;
}

export interface SiteStructure {
    readonly pages: Readonly<Record<PageKey, boolean>>;
    readonly homeSections: readonly { readonly type: HomeSectionType; readonly on: boolean }[];
}

export interface SiteSeo {
    readonly title: string;
    readonly description: string;
    readonly slug: string;
    readonly ogImage: string | null;
    readonly favicon: string | null;
}

export interface SitePublish {
    readonly siteName: string;
}

export interface SiteConfig {
    readonly content: SiteContent;
    readonly design: SiteDesign;
    readonly structure: SiteStructure;
    readonly seo: SiteSeo;
    readonly publish: SitePublish;
}

export interface SiteVersion {
    readonly number: number;
    /** ISO zaman. */
    readonly at: string;
    readonly note: string;
    readonly config: SiteConfig;
}

export interface SiteDocument {
    readonly draft: SiteConfig;
    readonly publishedNumber: number | null;
    readonly versions: readonly SiteVersion[];
}

export const PAGE_DEFS: readonly { readonly key: PageKey; readonly label: string; readonly path: string | null; readonly optional: boolean; readonly hint: string }[] = [
    { key: 'hakkimizda', label: 'Hakkımızda', path: '/hakkimizda', optional: false, hint: 'Kliniğin hikâyesi ve yaklaşımı.' },
    { key: 'hekimler', label: 'Veteriner Hekimlerimiz', path: '/hekimler', optional: false, hint: 'Hekimler, uzmanlıkları.' },
    { key: 'hizmetler', label: 'Hizmetlerimiz', path: '/hizmetler', optional: false, hint: 'Bütün hizmetlerin listesi.' },
    { key: 'hizmetDetay', label: 'Hizmet Detayları', path: null, optional: false, hint: 'Her hizmetin kendi sayfası.' },
    { key: 'rehber', label: 'Sağlık Rehberi', path: '/saglik-rehberi', optional: false, hint: 'Hasta sahipleri için yazılar.' },
    { key: 'galeri', label: 'Galeri', path: '/galeri', optional: false, hint: 'Klinikten fotoğraflar.' },
    { key: 'iletisim', label: 'İletişim', path: '/iletisim', optional: false, hint: 'Adres, saatler, konum.' },
    { key: 'randevu', label: 'Randevu', path: '/randevu', optional: true, hint: 'Online randevu bağlantısı, telefon ve saatler.' },
    { key: 'acil', label: 'Acil Veteriner Hizmeti', path: '/acil', optional: true, hint: 'Acil durumda ne yapılacağı.' },
    { key: 'sss', label: 'Sıkça Sorulan Sorular', path: '/sss', optional: true, hint: 'Soru ve yanıtlar.' },
    { key: 'ekibimiz', label: 'Ekibimiz', path: '/ekibimiz', optional: true, hint: 'Hekim dışındaki ekip de görünür.' },
    { key: 'subeler', label: 'Şubelerimiz', path: '/subelerimiz', optional: true, hint: 'Birden çok şube varsa.' }
];

export const HOME_SECTION_LABELS: Readonly<Record<SectionType, string>> = {
    nav: 'Navigasyon',
    hero: 'Hero',
    about: 'Klinik tanıtımı',
    services: 'Hizmetler',
    team: 'Hekimler',
    features: 'Öne çıkan özellikler',
    gallery: 'Fotoğraf galerisi',
    guide: 'Sağlık rehberi',
    contact: 'İletişim ve harita',
    footer: 'Footer'
};
