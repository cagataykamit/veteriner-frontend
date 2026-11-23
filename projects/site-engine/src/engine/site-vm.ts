import { PAGE_DEFS, type CopyKey, type HomeSectionType, type PageKey, type SiteBranch, type SiteConfig, type SiteCopy, type SiteFaq, type SiteFeature, type SiteImage } from '../model/site.model';
import { clinicStatus, hasWorkingHours, hoursGroups, nextSlotDays, type ClinicStatus, type HoursGroup, type SlotDayVm } from './site-hours';
import { safeHref, safeImage, safeImageSrc, socialLinks, type SocialVm } from './site-links';
import { isStockPhoto, STOCK_GALLERY, stockArticlePhoto, stockSectionPhoto, stockServicePhoto, type SectionPhotoSlot } from './stock-photos';

export interface ServiceVm {
    readonly slug: string;
    readonly title: string;
    readonly summary: string;
    readonly paragraphs: readonly string[];
    readonly image: SiteImage | null;
    readonly path: string;
}

export interface MemberVm {
    readonly slug: string;
    readonly name: string;
    readonly initials: string;
    readonly title: string;
    readonly specialties: readonly string[];
    readonly bio: string;
    readonly image: SiteImage | null;
    readonly isDoctor: boolean;
}

export interface ArticleVm {
    readonly slug: string;
    readonly category: string;
    readonly title: string;
    readonly summary: string;
    readonly paragraphs: readonly string[];
    readonly minutes: number;
    readonly image: SiteImage | null;
    readonly path: string;
}

export interface LinkVm {
    readonly label: string;
    readonly path: string;
}

/** Eylem düğmesi (K11): online randevu açıksa kliniğin talep formuna gider, kapalıysa telefona düşer; telefon da yoksa çizilmez. */
export interface CtaVm {
    readonly label: string;
    readonly path: string | null;
    readonly href: string | null;
}

/** Yazı işareti: ad büyük, tür eki ("Veteriner Kliniği") altında küçük. Logo olsa da olmasa da çizilir. */
export interface WordmarkVm {
    readonly main: string;
    readonly sub: string;
}

/**
 * Sitenin çizime hazır hâli. Bölümler yalnız bunu okur; boş veri burada elenir, bölüm boşsa görünmez. `pages` de içeriğe
 * göre düzeltilir: açık ama boş sayfa menüye girmez, adresi "bulunamadı" olur. Bağlantı ve görsel adresleri `site-links`'ten geçmiştir.
 * Klinik görsel yüklemediyse hazır fotoğraf gelir (K7); yüklenemeyen adres `unavailable` ile düşer, bölüm görselsiz düzenini çizer.
 */
export interface SiteVm {
    readonly name: string;
    readonly wordmark: WordmarkVm;
    readonly logo: string | null;
    readonly logoCenter: boolean;
    readonly slogan: string;
    readonly intro: string;
    readonly location: string;
    readonly address: string;
    readonly phone: string;
    readonly telHref: string | null;
    readonly whatsappHref: string | null;
    readonly bookingHref: string | null;
    /** En yakın müsait saatler (TIER-017); online randevu kapalıysa ya da saat yoksa boş. */
    readonly nextSlotDays: readonly SlotDayVm[];
    readonly email: string;
    readonly mailHref: string | null;
    readonly mapHref: string | null;
    readonly social: readonly SocialVm[];
    readonly status: ClinicStatus;
    /** Klinik saat girmediyse durum ve saat tablosu çizilmez. */
    readonly hasHours: boolean;
    readonly groups: readonly HoursGroup[];
    readonly copy: SiteCopy;
    readonly heroImage: SiteImage | null;
    readonly aboutImage: SiteImage | null;
    readonly featuresImage: SiteImage | null;
    /** Bölüm fotoğrafları: kliniğin yüklediği, yoksa konseptin hazır karesi (K7); yüklenemeyen düşer. */
    readonly photos: Readonly<Record<SectionPhotoSlot, SiteImage | null>>;
    /** Sitede hazır fotoğraf çiziliyor: "temsili görsel" ibaresi görünür. */
    readonly usesStock: boolean;
    readonly aboutParagraphs: readonly string[];
    readonly services: readonly ServiceVm[];
    readonly doctors: readonly MemberVm[];
    readonly members: readonly MemberVm[];
    readonly features: readonly SiteFeature[];
    readonly gallery: readonly SiteImage[];
    readonly articles: readonly ArticleVm[];
    readonly faqs: readonly SiteFaq[];
    readonly emergencyText: string;
    readonly branches: readonly SiteBranch[];
    readonly pages: Readonly<Record<PageKey, boolean>>;
    readonly menu: readonly LinkVm[];
    /** Üst çubukta masaüstünde açık duran ana bağlantılar (`NAV_PRIMARY` sırasıyla); kalanı `navMore`, "Diğer" altında. */
    readonly navPrimary: readonly LinkVm[];
    readonly navMore: readonly LinkVm[];
    readonly cta: CtaVm | null;
    readonly homeSections: readonly HomeSectionType[];
    readonly siteName: string;
}

const split = (text: string): string[] =>
    text
        .split(/\n\s*\n/)
        .map((part) => part.trim())
        .filter(Boolean);

const MENU_KEYS: readonly PageKey[] = ['hakkimizda', 'hizmetler', 'hekimler', 'rehber', 'galeri', 'sss', 'acil', 'ekibimiz', 'subeler', 'iletisim'];
/**
 * Üst çubuğun ana bağlantıları, önem sırasıyla (K-01): en çok beş. Hekimler sayfası kapalıysa ekip sayfası onun yerini alır. Diğer açık
 * sayfalar "Diğer" menüsündedir; telefonda hepsi "Menü"dedir.
 */
const NAV_PRIMARY: readonly (readonly PageKey[])[] = [['hizmetler'], ['hakkimizda'], ['hekimler', 'ekibimiz'], ['galeri'], ['iletisim']];

const MENU_LABELS: Partial<Record<PageKey, string>> = { hekimler: 'Hekimler', hizmetler: 'Hizmetler', rehber: 'Sağlık Rehberi', sss: 'SSS', acil: 'Acil', subeler: 'Şubeler', ekibimiz: 'Ekibimiz' };

/** "Dr. Örnek Hekim" → "ÖH": unvan kısaltmaları (nokta ile biten) atlanır. */
export function memberInitials(name: string): string {
    const words = name
        .trim()
        .split(/\s+/)
        .filter((word) => word && !word.endsWith('.'));

    return (words.length ? words : [name.trim() || 'H'])
        .slice(0, 2)
        .map((word) => word.charAt(0).toLocaleUpperCase('tr'))
        .join('');
}

/** Klinik adının sonundaki tür eki; aranırken Türkçe küçük harfe çevrilir. */
const NAME_KIND = /\s+((veteriner|hayvan)\s+(kliniği|polikliniği|hastanesi|sağlık merkezi)|pet kliniği)$/u;

/** "Merkez Pati Veteriner Kliniği" → "Merkez Pati" + "Veteriner Kliniği". Ek yoksa ya da adın tamamıysa ad tek satırdır. */
export function wordmark(name: string): WordmarkVm {
    const match = NAME_KIND.exec(name.toLocaleLowerCase('tr'));

    if (!match || match.index === 0) return { main: name, sub: '' };

    return { main: name.slice(0, match.index).trim(), sub: name.slice(match.index).trim() };
}

/** `wa.me` ülke kodlu, başında sıfır olmayan numara ister; Türkiye'de 0 ile ya da ülke kodsuz yazılan numara tamamlanır. */
export function whatsappNumber(raw: string): string {
    const digits = raw.replace(/\D/g, '');

    if (/^0\d{10}$/.test(digits)) return `90${digits.slice(1)}`;
    if (/^\d{10}$/.test(digits)) return `90${digits}`;

    return digits;
}

/**
 * Telefon gösterimi panel ve portalla aynı biçimde: Türkiye numarası "+90 543 958 00 91" olur; tanınmayan biçim (yurt dışı, kısa numara)
 * kırpılıp olduğu gibi kalır. `tel:` bağlantısı ham değerden kurulur, bu yalnız gösterimdir.
 */
export function displayPhone(raw: string): string {
    const digits = whatsappNumber(raw);

    if (!/^90[2-58]\d{9}$/.test(digits)) return raw.trim();

    return `+90 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
}

/** Metinler: klinik boş bıraktıysa konseptin önerdiği cümle. */
function resolveCopy(content: SiteCopy, voice: SiteCopy): SiteCopy {
    return Object.fromEntries(Object.keys(voice).map((key) => [key, content[key as CopyKey]?.trim() || voice[key as CopyKey]])) as unknown as SiteCopy;
}

const NOTHING_FAILED: ReadonlySet<string> = new Set();

export function buildSiteVm(config: SiteConfig, voice: SiteCopy, now: Date, unavailable: ReadonlySet<string> = NOTHING_FAILED): SiteVm {
    const { content, structure } = config;
    const { clinic } = content;
    const usable = (image: SiteImage | null): SiteImage | null => (image && !unavailable.has(image.src) ? image : null);
    const uploaded = (image: SiteImage | null): SiteImage | null => usable(safeImage(image));
    const name = clinic.name.trim() || 'Klinik adı';
    const place = [clinic.district.trim(), clinic.city.trim()].filter(Boolean);
    const address = clinic.address.trim();
    const phone = displayPhone(clinic.phone);
    const email = clinic.email.trim();
    const phoneDigits = clinic.phone.replace(/[^\d+]/g, '');
    const whatsappDigits = whatsappNumber(clinic.whatsapp);
    const telHref = phoneDigits ? safeHref(`tel:${phoneDigits}`) : null;
    const mapQuery = [address, ...place].join(', ');
    const copy = resolveCopy(content.copy, voice);
    const members: MemberVm[] = content.members
        .filter((member) => member.name.trim())
        .map((member) => ({
            slug: member.slug,
            name: member.name.trim(),
            initials: memberInitials(member.name),
            title: member.title.trim(),
            specialties: member.specialties
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
            bio: member.bio.trim(),
            image: uploaded(member.image),
            isDoctor: member.kind === 'hekim'
        }));
    const services: ServiceVm[] = content.services
        .filter((service) => service.title.trim())
        .map((service, index) => ({
            slug: service.slug,
            title: service.title.trim(),
            summary: service.summary.trim(),
            paragraphs: split(service.body),
            image: uploaded(service.image) ?? usable(stockServicePhoto(service.slug, index)),
            path: structure.pages.hizmetDetay ? `/hizmetler/${service.slug}` : structure.pages.hizmetler ? '/hizmetler' : '/#services'
        }));
    const articles: ArticleVm[] = content.articles
        .filter((article) => article.title.trim())
        .map((article, index) => ({
            slug: article.slug,
            category: article.category.trim(),
            title: article.title.trim(),
            summary: article.summary.trim(),
            paragraphs: split(article.body),
            minutes: article.minutes,
            image: uploaded(article.image) ?? usable(stockArticlePhoto(article.slug, index)),
            path: structure.pages.rehber ? `/saglik-rehberi/${article.slug}` : '/#guide'
        }));
    const features = content.features.filter((feature) => feature.title.trim());
    const uploadedGallery = content.gallery.map(uploaded).filter((image): image is SiteImage => image !== null);
    const gallery = uploadedGallery.length ? uploadedGallery : STOCK_GALLERY.filter((image) => usable(image));
    const heroImage = uploaded(content.heroImage);
    const aboutImage = uploaded(content.aboutImage);
    const featuresImage = uploaded(content.featuresImage);
    const { conceptKey } = config.design;
    const photos: Record<SectionPhotoSlot, SiteImage | null> = {
        hero: heroImage ?? usable(stockSectionPhoto(conceptKey, 'hero')),
        about: aboutImage ?? usable(stockSectionPhoto(conceptKey, 'about')),
        features: featuresImage ?? usable(stockSectionPhoto(conceptKey, 'features'))
    };
    const faqs = content.faqs.filter((faq) => faq.question.trim() && faq.answer.trim());
    const branches = content.branches.filter((branch) => branch.name.trim()).map((branch) => ({ ...branch, phone: displayPhone(branch.phone) }));
    const emergencyText = content.emergencyText.trim();
    const aboutParagraphs = split(copy.aboutText);
    const doctors = members.filter((member) => member.isDoctor);
    const hasContact = !!(address || phone || email);
    const hasContent: Readonly<Record<HomeSectionType, boolean>> = {
        about: aboutParagraphs.length > 0,
        services: services.length > 0,
        team: doctors.length > 0,
        features: features.length > 0,
        gallery: gallery.length > 0,
        guide: articles.length > 0,
        contact: hasContact
    };
    const pages: Readonly<Record<PageKey, boolean>> = {
        ...structure.pages,
        hekimler: structure.pages.hekimler && doctors.length > 0,
        hizmetler: structure.pages.hizmetler && services.length > 0,
        hizmetDetay: structure.pages.hizmetDetay && services.length > 0,
        rehber: structure.pages.rehber && articles.length > 0,
        galeri: structure.pages.galeri && gallery.length > 0,
        iletisim: structure.pages.iletisim && hasContact,
        acil: structure.pages.acil && !!emergencyText,
        sss: structure.pages.sss && faqs.length > 0,
        ekibimiz: structure.pages.ekibimiz && members.length > 0,
        subeler: structure.pages.subeler && branches.length > 0
    };
    const menu: LinkVm[] = MENU_KEYS.filter((key) => pages[key]).map((key) => {
        const def = PAGE_DEFS.find((page) => page.key === key)!;

        return { label: MENU_LABELS[key] ?? def.label, path: def.path! };
    });
    const linkOf = (key: PageKey): LinkVm | undefined => menu.find((link) => link.path === PAGE_DEFS.find((page) => page.key === key)!.path);
    const navPrimary = NAV_PRIMARY.map((choices) => choices.map(linkOf).find((link) => link !== undefined)).filter((link): link is LinkVm => link !== undefined);
    const navMore = menu.filter((link) => !navPrimary.includes(link));
    const bookingHref = safeHref(clinic.bookingUrl);
    const cta: CtaVm | null = bookingHref ? { label: copy.ctaPrimary, path: null, href: bookingHref } : telHref ? { label: 'Hemen ara', path: null, href: telHref } : null;
    const homeSections = structure.homeSections.filter((section) => section.on && hasContent[section.type]).map((section) => section.type);
    const isShown = (type: HomeSectionType, page: PageKey): boolean => homeSections.includes(type) || pages[page];
    // Hizmet kartları ikonludur; hizmet fotoğrafı yalnız hizmetin kendi sayfasında çizilir.
    const drawn: readonly (SiteImage | null)[] = [
        photos.hero,
        ...(isShown('about', 'hakkimizda') ? [photos.about] : []),
        ...(isShown('features', 'hakkimizda') && features.length ? [photos.features] : []),
        ...(pages.hizmetDetay ? services.map((service) => service.image) : []),
        ...(isShown('guide', 'rehber') ? articles.map((article) => article.image) : []),
        ...(isShown('gallery', 'galeri') ? gallery : [])
    ];

    return {
        name,
        wordmark: wordmark(name),
        logo: safeImageSrc(clinic.logo),
        logoCenter: config.design.logoPlacement === 'orta',
        slogan: clinic.slogan.trim(),
        intro: clinic.intro.trim(),
        location: place.join(', '),
        address,
        phone,
        telHref,
        whatsappHref: whatsappDigits ? `https://wa.me/${whatsappDigits}` : null,
        bookingHref,
        nextSlotDays: nextSlotDays(clinic.nextSlots, bookingHref, now),
        email,
        mailHref: email ? safeHref(`mailto:${email}`) : null,
        mapHref: safeHref(clinic.mapUrl) ?? (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}` : null),
        social: socialLinks(clinic),
        status: clinicStatus(clinic.workingDays, now),
        hasHours: hasWorkingHours(clinic.workingDays),
        groups: hoursGroups(clinic.workingDays, now),
        copy,
        heroImage,
        aboutImage,
        featuresImage,
        photos,
        usesStock: drawn.some(isStockPhoto),
        aboutParagraphs,
        services,
        doctors,
        members,
        features,
        gallery,
        articles,
        faqs,
        emergencyText,
        branches,
        pages,
        menu,
        navPrimary,
        navMore,
        cta,
        homeSections,
        siteName: config.publish.siteName.trim() || name
    };
}
