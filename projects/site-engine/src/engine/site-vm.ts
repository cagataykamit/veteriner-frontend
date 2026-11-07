import { PAGE_DEFS, type CopyKey, type HomeSectionType, type PageKey, type SiteBranch, type SiteConfig, type SiteCopy, type SiteFaq, type SiteFeature, type SiteImage } from '../model/site.model';
import { clinicStatus, hoursGroups, type ClinicStatus, type HoursGroup } from './site-hours';
import { safeHref, safeImage, safeImageSrc, socialLinks, type SocialVm } from './site-links';

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

/** Eylem düğmesi: sitede randevu sayfası kapalıysa telefona düşer; telefon da yoksa düğme çizilmez. */
export interface CtaVm {
    readonly label: string;
    readonly path: string | null;
    readonly href: string | null;
}

/**
 * Sitenin çizime hazır hâli. Bölüm alternatifleri yalnız bunu okur; boş veri burada elenir, bölüm boşsa görünmez. `pages` de içeriğe
 * göre düzeltilir: açık ama boş sayfa menüye girmez, adresi "bulunamadı" olur. Bağlantı ve görsel adresleri `site-links`'ten geçmiştir.
 */
export interface SiteVm {
    readonly name: string;
    readonly initial: string;
    readonly logo: string | null;
    readonly logoCenter: boolean;
    readonly slogan: string;
    readonly intro: string;
    readonly location: string;
    readonly address: string;
    readonly phone: string;
    readonly telHref: string | null;
    readonly whatsappHref: string | null;
    readonly email: string;
    readonly mailHref: string | null;
    readonly mapHref: string | null;
    readonly social: readonly SocialVm[];
    readonly status: ClinicStatus;
    readonly groups: readonly HoursGroup[];
    readonly copy: SiteCopy;
    readonly heroImage: SiteImage | null;
    readonly aboutImage: SiteImage | null;
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

/** Metinler: klinik boş bıraktıysa konseptin önerdiği cümle. */
function resolveCopy(content: SiteCopy, voice: SiteCopy): SiteCopy {
    return Object.fromEntries(Object.keys(voice).map((key) => [key, content[key as CopyKey]?.trim() || voice[key as CopyKey]])) as unknown as SiteCopy;
}

export function buildSiteVm(config: SiteConfig, voice: SiteCopy, now: Date): SiteVm {
    const { content, structure } = config;
    const { clinic } = content;
    const name = clinic.name.trim() || 'Klinik adı';
    const place = [clinic.district.trim(), clinic.city.trim()].filter(Boolean);
    const address = clinic.address.trim();
    const phone = clinic.phone.trim();
    const email = clinic.email.trim();
    const phoneDigits = clinic.phone.replace(/[^\d+]/g, '');
    const whatsappDigits = clinic.whatsapp.replace(/\D/g, '');
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
            image: safeImage(member.image),
            isDoctor: member.kind === 'hekim'
        }));
    const services: ServiceVm[] = content.services
        .filter((service) => service.title.trim())
        .map((service) => ({
            slug: service.slug,
            title: service.title.trim(),
            summary: service.summary.trim(),
            paragraphs: split(service.body),
            image: safeImage(service.image),
            path: structure.pages.hizmetDetay ? `/hizmetler/${service.slug}` : structure.pages.hizmetler ? '/hizmetler' : '/#services'
        }));
    const articles: ArticleVm[] = content.articles
        .filter((article) => article.title.trim())
        .map((article) => ({
            slug: article.slug,
            category: article.category.trim(),
            title: article.title.trim(),
            summary: article.summary.trim(),
            paragraphs: split(article.body),
            minutes: article.minutes,
            image: safeImage(article.image),
            path: structure.pages.rehber ? `/saglik-rehberi/${article.slug}` : '/#guide'
        }));
    const features = content.features.filter((feature) => feature.title.trim());
    const gallery = content.gallery.map(safeImage).filter((image): image is SiteImage => image !== null);
    const faqs = content.faqs.filter((faq) => faq.question.trim() && faq.answer.trim());
    const branches = content.branches.filter((branch) => branch.name.trim());
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
    const cta: CtaVm | null = pages.randevu ? { label: copy.ctaPrimary, path: '/randevu', href: null } : telHref ? { label: 'Hemen ara', path: null, href: telHref } : null;

    return {
        name,
        initial: name.charAt(0).toLocaleUpperCase('tr'),
        logo: safeImageSrc(clinic.logo),
        logoCenter: config.design.logoPlacement === 'orta',
        slogan: clinic.slogan.trim(),
        intro: clinic.intro.trim(),
        location: place.join(', '),
        address,
        phone,
        telHref,
        whatsappHref: whatsappDigits ? `https://wa.me/${whatsappDigits}` : null,
        email,
        mailHref: email ? safeHref(`mailto:${email}`) : null,
        mapHref: safeHref(clinic.mapUrl) ?? (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}` : null),
        social: socialLinks(clinic),
        status: clinicStatus(clinic.workingDays, now),
        groups: hoursGroups(clinic.workingDays, now),
        copy,
        heroImage: safeImage(content.heroImage),
        aboutImage: safeImage(content.aboutImage),
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
        cta,
        homeSections: structure.homeSections.filter((section) => section.on && hasContent[section.type]).map((section) => section.type),
        siteName: config.publish.siteName.trim() || name
    };
}
