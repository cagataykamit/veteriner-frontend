import type { CharacterKey, GroundKey, LogoPlacement, RadiusKey, SectionType, SiteColors, SiteCopy, SiteDesign } from '../model/site.model';

/**
 * Konsept: bölüm sisteminin hazır kombinasyonu. Seçilince varsayılan bölüm alternatifleri, renk, yazı ve köşe gelir; klinik sonra
 * tek tek değiştirir. `voice`, klinik boş bıraktığı metinlerde kullanılan elle yazılmış cümlelerdir.
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
            heroEyebrow: 'Kedi, köpek ve küçük evcil hayvanlar',
            heroTitle: 'Veteriner hekimlikte açık ve anlaşılır bir yol.',
            heroText: 'Muayeneden aşıya, ne yapacağımızı ve nedenini önce size anlatırız.',
            ctaPrimary: 'Randevu al',
            ctaSecondary: 'Hizmetlere bak',
            aboutTitle: 'Klinik',
            aboutText: 'Mahallemizdeki küçük hayvanlar için günlük bakımı düzenli ve anlaşılır tutmaya çalışıyoruz. Her muayenenin sonunda ne yapıldığını, sırada ne olduğunu ve ne zaman görüşeceğimizi bilirsiniz.',
            servicesTitle: 'Hizmetler',
            servicesIntro: 'Günlük bakımdan planlı operasyona kadar klinikte yaptıklarımız.',
            teamTitle: 'Hekimler',
            teamIntro: 'Hayvanınızı kim muayene edecek, önceden bilin.',
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
            heroEyebrow: 'Randevulu veteriner kliniği',
            heroTitle: 'Sakin bir muayene, özenli bir takip.',
            heroText: 'Her randevuya yeterince zaman ayırır, süreci başından sonuna aynı hekimle yürütürüz.',
            ctaPrimary: 'Randevu talep edin',
            ctaSecondary: 'Hizmetler',
            aboutTitle: 'Klinik',
            aboutText: 'Kliniğimizde randevuları sık tutmuyoruz. Hayvanınızın geçmişini dinlemek, muayeneyi telaşsız yapmak ve kararları sizinle birlikte almak için zaman ayırıyoruz.',
            servicesTitle: 'Hizmetlerimiz',
            servicesIntro: 'Günlük bakımdan planlı operasyona, her adımı önceden konuşulan bir süreç.',
            teamTitle: 'Hekimlerimiz',
            teamIntro: 'Takibini aynı hekimle sürdürmek isteyenler için.',
            featuresTitle: 'Yaklaşımımız',
            galleryTitle: 'Klinikten kareler',
            guideTitle: 'Sağlık rehberi',
            contactTitle: 'Ziyaret',
            contactText: 'Gelmeden önce aramanızı rica ederiz; size uygun saati birlikte belirleyelim.'
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
            heroEyebrow: 'Mahallenizin veterineri',
            heroTitle: 'Hoş geldiniz. Minik dostunuz bugün nasıl?',
            heroText: 'Aşı zamanı mı geldi, iştahı mı kesildi, yoksa sadece bir sorunuz mu var? Arayın, birlikte bakalım.',
            ctaPrimary: 'Randevu alalım',
            ctaSecondary: 'Neler yapıyoruz?',
            aboutTitle: 'Biz kimiz?',
            aboutText: 'Yakınınızda, kapısından rahatça girebileceğiniz bir kliniğiz. Kedinizin de köpeğinizin de adını öğrenir, huyunu suyunu not alırız.',
            servicesTitle: 'Neyle geldiniz?',
            servicesIntro: 'Günlük işlerden planlı operasyonlara, burada yapabildiklerimiz.',
            teamTitle: 'Tanışalım',
            teamIntro: 'Sizi ve minik dostunuzu karşılayacak hekimler.',
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
            heroEyebrow: 'Bütün yaşamı boyunca',
            heroTitle: 'Hayvanınızın temposuna uyan bir bakım.',
            heroText: 'Beslenmesini, yaşını ve alışkanlıklarını birlikte ele alıyor, telaşsız bir muayene ortamı kuruyoruz.',
            ctaPrimary: 'Randevu alın',
            ctaSecondary: 'Hizmetler',
            aboutTitle: 'Yaklaşımımız',
            aboutText: 'Hayvanınızı yalnız hasta olduğunda değil, sağlıklıyken de tanımak istiyoruz. Günlük düzeni, beslenmesi ve yaşı muayene kadar önemli.',
            servicesTitle: 'Neler yapıyoruz',
            servicesIntro: 'Her yaşta düzenli takip ve gerektiğinde tedavi.',
            teamTitle: 'Hekimlerimiz',
            teamIntro: 'Hayvanınızı yıllar içinde tanıyan bir ekip.',
            featuresTitle: 'Bize gelince',
            galleryTitle: 'Günlük hayatımız',
            guideTitle: 'Sağlık defteri',
            contactTitle: 'Ziyaret edin',
            contactText: 'Sakin saatleri telefonda sorabilirsiniz.'
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
