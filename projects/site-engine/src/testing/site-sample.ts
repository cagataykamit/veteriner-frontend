import { designFromConcept, SITE_CONCEPTS } from '../engine/site-concepts';
import type { CopyKey, HomeSectionType, SiteConfig, SiteContent, SiteCopy, SiteImage, SiteStructure, WorkingDay } from '../model/site.model';

/**
 * Yalnız spec'ler için örnek veri: gerçek klinik, kişi ya da numara değildir. Uygulama paketine girmez (`src/index.ts` dışa açmaz).
 * Görsel adresi tek pikselli data URL'dir; test ağa çıkmaz.
 */
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

export const sampleImage = (alt: string): SiteImage => ({ src: PIXEL, alt });

const weekday = (dayOfWeek: number): WorkingDay => ({ dayOfWeek, isClosed: false, opensAt: '09:00', closesAt: '19:00', breakStartsAt: '13:00', breakEndsAt: '14:00' });

const EMPTY_COPY: SiteCopy = {
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
} satisfies Record<CopyKey, string>;

const SAMPLE_CONTENT: SiteContent = {
    clinic: {
        name: 'Örnek Veteriner Kliniği',
        logo: null,
        slogan: 'Küçük dostlar için günlük bakım',
        intro: 'Kedi, köpek ve küçük evcil hayvanlar için muayene, aşı ve takip.',
        phone: '0000 000 00 00',
        whatsapp: '0000 000 00 00',
        email: 'ornek@example.com',
        website: 'ornek.example.com',
        address: 'Örnek Mahallesi, Deneme Sokak No: 0',
        district: 'Çankaya',
        city: 'Ankara',
        mapUrl: '',
        instagram: 'ornekklinik',
        facebook: '',
        workingDays: [weekday(1), weekday(2), weekday(3), weekday(4), weekday(5), { dayOfWeek: 6, isClosed: false, opensAt: '10:00', closesAt: '16:00', breakStartsAt: null, breakEndsAt: null }, { dayOfWeek: 0, isClosed: true, opensAt: null, closesAt: null, breakStartsAt: null, breakEndsAt: null }]
    },
    copy: EMPTY_COPY,
    heroImage: sampleImage('Muayene masasında köpek'),
    aboutImage: sampleImage('Kucakta tekir kedi'),
    services: [
        { slug: 'genel-muayene', title: 'Genel muayene', summary: 'Tartı, ateş, kalp ve akciğer dinleme.', body: 'Birinci paragraf.\n\nİkinci paragraf.', image: sampleImage('Muayene') },
        { slug: 'asi', title: 'Aşı ve koruyucu bakım', summary: 'Yaşına göre aşı takvimi.', body: 'Takvimi birlikte planlarız.', image: null },
        { slug: 'laboratuvar', title: 'Laboratuvar', summary: 'Kan ve idrar tetkikleri.', body: 'Sonuçları birlikte okuruz.', image: sampleImage('Mikroskop') }
    ],
    members: [
        { slug: 'ornek-hekim', kind: 'hekim', name: 'Dr. Örnek Hekim', title: 'Veteriner hekim', specialties: 'İç hastalıklar, cerrahi', bio: 'Örnek biyografi.', image: sampleImage('Hekim') },
        { slug: 'deneme-kisi', kind: 'hekim', name: 'Vet. Hek. Deneme Kişi', title: 'Veteriner hekim', specialties: 'Kedi hastalıkları', bio: 'Örnek biyografi.', image: null },
        { slug: 'yardimci', kind: 'ekip', name: 'Örnek Yardımcı', title: 'Sağlık teknikeri', specialties: 'Laboratuvar', bio: 'Örnek biyografi.', image: null }
    ],
    features: [
        { title: 'Önce anlatırız', text: 'İşlemden önce nedenini söyleriz.' },
        { title: 'Yazılı takip', text: 'Tarihler size yazılı ulaşır.' }
    ],
    gallery: [sampleImage('Küçük köpek'), sampleImage('Pencerede kedi'), sampleImage('Çayırda köpek')],
    articles: [
        { slug: 'ilk-ziyaret', category: 'Kedi', title: 'Yavru kediyle ilk ziyaret', summary: 'Küçük hazırlıklar.', body: 'Birinci paragraf.\n\nİkinci paragraf.', minutes: 3, image: sampleImage('Yavru kedi') },
        { slug: 'asi-takvimi', category: 'Koruyucu bakım', title: 'Aşı takvimi nasıl planlanır?', summary: 'Hangi sorularla başlıyoruz.', body: 'Takvim.', minutes: 4, image: null },
        { slug: 'yasli-kopek', category: 'Köpek', title: 'Yaşlanan köpekte günlük düzen', summary: 'Evde küçük değişiklikler.', body: 'Düzen.', minutes: 3, image: sampleImage('Köpek') }
    ],
    faqs: [{ question: 'Randevusuz gelebilir miyim?', answer: 'Önce telefonla sormanızı öneririz.' }],
    emergencyText: 'Kapalı olduğumuz saatlerde telefonla ulaşın.',
    branches: [{ name: 'Merkez şube', address: 'Örnek Mahallesi', phone: '0000 000 00 00' }]
};

const HOME_ORDER: readonly HomeSectionType[] = ['about', 'services', 'team', 'features', 'gallery', 'guide', 'contact'];

const ALL_PAGES_ON: SiteStructure = {
    pages: { hakkimizda: true, hekimler: true, hizmetler: true, hizmetDetay: true, rehber: true, galeri: true, iletisim: true, acil: true, sss: true, randevu: true, ekibimiz: true, subeler: true },
    homeSections: HOME_ORDER.map((type) => ({ type, on: true }))
};

/** Bütün içerik dolu, bütün sayfalar açık. */
export function sampleConfig(conceptKey = 'modern'): SiteConfig {
    return {
        content: SAMPLE_CONTENT,
        design: designFromConcept(SITE_CONCEPTS.find((concept) => concept.key === conceptKey)!),
        structure: ALL_PAGES_ON,
        seo: { title: '', description: '', slug: 'ornek-klinik', ogImage: null, favicon: null },
        publish: { siteName: '' }
    };
}

/** Görselin hiç olmadığı site: klinik yüklemedi, hazır set boş. */
export function withoutImages(config: SiteConfig): SiteConfig {
    const { content } = config;

    return {
        ...config,
        content: {
            ...content,
            clinic: { ...content.clinic, logo: null },
            heroImage: null,
            aboutImage: null,
            gallery: [],
            services: content.services.map((service) => ({ ...service, image: null })),
            members: content.members.map((member) => ({ ...member, image: null })),
            articles: content.articles.map((article) => ({ ...article, image: null }))
        }
    };
}

/** Sihirbaz yeni açılmış gibi: hiçbir alan doldurulmadı. */
export function emptyContent(config: SiteConfig): SiteConfig {
    return {
        ...config,
        content: {
            clinic: { name: '', logo: null, slogan: '', intro: '', phone: '', whatsapp: '', email: '', website: '', address: '', district: '', city: '', mapUrl: '', instagram: '', facebook: '', workingDays: [] },
            copy: EMPTY_COPY,
            heroImage: null,
            aboutImage: null,
            services: [],
            members: [],
            features: [],
            gallery: [],
            articles: [],
            faqs: [],
            emergencyText: '',
            branches: []
        }
    };
}

export function patchClinic(config: SiteConfig, clinic: Partial<SiteContent['clinic']>): SiteConfig {
    return { ...config, content: { ...config.content, clinic: { ...config.content.clinic, ...clinic } } };
}

export function patchContent(config: SiteConfig, content: Partial<SiteContent>): SiteConfig {
    return { ...config, content: { ...config.content, ...content } };
}
