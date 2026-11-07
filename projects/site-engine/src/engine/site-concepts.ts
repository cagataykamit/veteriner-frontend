import type { CharacterKey, GroundKey, LogoPlacement, RadiusKey, SectionType, SiteColors, SiteCopy, SiteDesign } from '../model/site.model';

/**
 * Konsept: bölüm sisteminin hazır kombinasyonu. Seçilince varsayılan bölüm alternatifleri, renk, yazı ve köşe gelir; klinik sonra
 * tek tek değiştirir. `voice`, klinik boş bıraktığı metinlerde kullanılan elle yazılmış cümlelerdir: her kliniğe uyacak kadar genel
 * kalır, kliniğe dair doğrulanamayan iddia içermez (ADR-045 K14; spec korur).
 */
export interface SiteConcept {
    readonly key: string;
    readonly name: string;
    readonly idea: string;
    readonly colors: SiteColors;
    readonly ground: GroundKey;
    readonly headFont: string;
    readonly bodyFont: string;
    readonly radius: RadiusKey;
    readonly logoPlacement: LogoPlacement;
    readonly character: CharacterKey;
    readonly sectionKey: string;
    readonly voice: SiteCopy;
}

const ALL_SECTIONS: readonly SectionType[] = ['nav', 'hero', 'about', 'services', 'team', 'features', 'gallery', 'guide', 'contact', 'footer'];

export const SITE_CONCEPTS: readonly SiteConcept[] = [
    {
        key: 'modern',
        name: 'Modern Veterinary',
        idea: 'Beyaz zemin, dev tipografi, ince çizgiler. Bir mimarlık bürosunun kataloğu gibi: süs yok, ölçü var.',
        colors: { primary: '#0f4c81', secondary: '#5b7083', accent: '#e4572e' },
        ground: 'beyaz',
        headFont: 'instrument',
        bodyFont: 'instrument',
        radius: 'keskin',
        logoPlacement: 'sol',
        character: 'sade',
        sectionKey: 'modern',
        voice: {
            heroEyebrow: 'Veteriner kliniği',
            heroTitle: 'Evcil hayvanınızın sağlığı için bize ulaşın.',
            heroText: 'Klinikle ilgili temel bilgileri ve iletişim bilgilerimizi bu sayfada bulabilirsiniz.',
            ctaPrimary: 'Randevu al',
            ctaSecondary: 'Hizmetlere bak',
            aboutTitle: 'Klinik',
            aboutText: 'Evcil hayvanlar için hizmet veren bir veteriner kliniğiyiz. Sorularınız için bize ulaşabilirsiniz.',
            servicesTitle: 'Hizmetler',
            servicesIntro: 'Klinikte sunduğumuz hizmetler.',
            teamTitle: 'Hekimler',
            teamIntro: 'Kliniğimizde görev yapan veteriner hekimler.',
            featuresTitle: 'Çalışma biçimimiz',
            galleryTitle: 'Klinikten',
            guideTitle: 'Sağlık rehberi',
            contactTitle: 'İletişim',
            contactText: 'Randevu ve sorularınız için arayın ya da uğrayın.'
        }
    },
    {
        key: 'premium',
        name: 'Premium Clinic',
        idea: 'Gece zemini, pirinç rengi ince çizgiler, iri tırnaklı yazı. Bir galeri afişi ve menü kartı gibi: sakin ve özenli.',
        colors: { primary: '#c7a66b', secondary: '#7d6f5c', accent: '#c7a66b' },
        ground: 'gece',
        headFont: 'cormorant',
        bodyFont: 'jost',
        radius: 'keskin',
        logoPlacement: 'orta',
        character: 'zarif',
        sectionKey: 'premium',
        voice: {
            heroEyebrow: 'Veteriner kliniği',
            heroTitle: 'Evcil dostunuzun sağlığı için.',
            heroText: 'Randevu ve sorularınız için bize ulaşabilirsiniz.',
            ctaPrimary: 'Randevu talep edin',
            ctaSecondary: 'Hizmetler',
            aboutTitle: 'Klinik',
            aboutText: 'Evcil hayvanlara veteriner hekimlik hizmeti sunuyoruz. Kliniğimiz hakkında bilgi almak için bize ulaşabilirsiniz.',
            servicesTitle: 'Hizmetlerimiz',
            servicesIntro: 'Kliniğimizde sunulan hizmetler.',
            teamTitle: 'Hekimlerimiz',
            teamIntro: 'Kliniğimizin veteriner hekimleri.',
            featuresTitle: 'Yaklaşımımız',
            galleryTitle: 'Klinikten kareler',
            guideTitle: 'Sağlık rehberi',
            contactTitle: 'Ziyaret',
            contactText: 'Adresimiz, çalışma saatlerimiz ve iletişim bilgilerimiz.'
        }
    },
    {
        key: 'friendly',
        name: 'Friendly Pet Care',
        idea: 'Sıcak krem zemin, dolgun renk blokları, buzdolabına iliştirilmiş fotoğraflar. Mahalle veterineriyle sohbet eder gibi.',
        colors: { primary: '#c8401f', secondary: '#f2b233', accent: '#0f6b62' },
        ground: 'krem',
        headFont: 'bricolage',
        bodyFont: 'figtree',
        radius: 'yuvarlak',
        logoPlacement: 'sol',
        character: 'samimi',
        sectionKey: 'friendly',
        voice: {
            heroEyebrow: 'Veteriner kliniğiniz',
            heroTitle: 'Hoş geldiniz. Minik dostunuz bugün nasıl?',
            heroText: 'Bir sorunuz mu var? Arayın ya da yazın.',
            ctaPrimary: 'Randevu alalım',
            ctaSecondary: 'Neler yapıyoruz?',
            aboutTitle: 'Biz kimiz?',
            aboutText: 'Evcil hayvanlar için hizmet veren bir veteriner kliniğiyiz. Sorunuz olursa çekinmeden bize ulaşın.',
            servicesTitle: 'Neyle geldiniz?',
            servicesIntro: 'Klinikte yapabildiklerimiz.',
            teamTitle: 'Tanışalım',
            teamIntro: 'Hekimlerimizle tanışın.',
            featuresTitle: 'Burada işler nasıl yürür?',
            galleryTitle: 'Klinikten kareler',
            guideTitle: 'Küçük notlar',
            contactTitle: 'Bize uğrayın',
            contactText: 'Sorunuz ne olursa olsun çekinmeyin; arayın, yazın ya da gelin.'
        }
    },
    {
        key: 'nature',
        name: 'Nature & Wellness',
        idea: 'Adaçayı zemin, kemerli pencereler, italik tırnaklı yazı, bol boşluk. Bir sera gibi ferah; acelesi olmayan bir ritim.',
        colors: { primary: '#2f4a36', secondary: '#8a9a6b', accent: '#a9582f' },
        ground: 'adacayi',
        headFont: 'newsreader',
        bodyFont: 'karla',
        radius: 'yumusak',
        logoPlacement: 'sol',
        character: 'dogal',
        sectionKey: 'nature',
        voice: {
            heroEyebrow: 'Hayvan dostlarımız için',
            heroTitle: 'Hayvanınızın sağlığı için buradayız.',
            heroText: 'Kliniğimiz hakkında bilgi almak ve bize ulaşmak için bu sayfayı kullanabilirsiniz.',
            ctaPrimary: 'Randevu alın',
            ctaSecondary: 'Hizmetler',
            aboutTitle: 'Hakkımızda',
            aboutText: 'Evcil hayvanlara veteriner hekimlik hizmeti veren bir kliniğiz. Bilgi almak için bize ulaşabilirsiniz.',
            servicesTitle: 'Neler yapıyoruz',
            servicesIntro: 'Klinikte sunduğumuz hizmetler.',
            teamTitle: 'Hekimlerimiz',
            teamIntro: 'Kliniğimizin veteriner hekimleri.',
            featuresTitle: 'Bize gelince',
            galleryTitle: 'Günlük hayatımız',
            guideTitle: 'Sağlık defteri',
            contactTitle: 'Ziyaret edin',
            contactText: 'Sorularınız için bizi arayabilirsiniz.'
        }
    }
];

export function conceptByKey(key: string): SiteConcept {
    return SITE_CONCEPTS.find((concept) => concept.key === key) ?? SITE_CONCEPTS[0];
}

/** Konseptin bütün tasarımı; bölümlerin hepsi kendi paketinden gelir. */
export function designFromConcept(concept: SiteConcept): SiteDesign {
    return {
        conceptKey: concept.key,
        colors: concept.colors,
        ground: concept.ground,
        headFont: concept.headFont,
        bodyFont: concept.bodyFont,
        radius: concept.radius,
        logoPlacement: concept.logoPlacement,
        character: concept.character,
        sections: Object.fromEntries(ALL_SECTIONS.map((type) => [type, concept.sectionKey])) as Record<SectionType, string>
    };
}
