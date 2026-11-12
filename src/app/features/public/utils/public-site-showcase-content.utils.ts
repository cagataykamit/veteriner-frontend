/**
 * Klinik web sitesi vitrini (`/ozellikler#klinik-web-sitesi`, ana sayfada kısa hali). Ziyaretçi ilk bakışta bunun kliniğin kendi
 * web sitesi olduğunu, panelden kendisinin kurduğunu ve dört hazır tasarım bulunduğunu görsün (ADR-045).
 * Görseller yayınlanmış örnek sitenin ilk ekranıdır: aynı sentetik "Örnek Veteriner Kliniği", dört tasarım, hazır fotoğraflarla
 * (`public/marketing/sites/`, 1280×800 WebP; gerçek klinik ya da kişi verisi yok). Abartı ve üstünlük sözü yok (ADR-034 karar 3).
 */

import { planAvailabilityText } from '@/app/entities/subscription/utils/pricing-plan.utils';
import { PUBLIC_VET_FINDER_HREF } from './public-navigation.utils';

export const PUBLIC_SITE_SHOWCASE = {
    /** Sayfa içi bağlantı kimliği (bölüm dizini, ana sayfadaki bağlantı). */
    id: 'klinik-web-sitesi',
    /** Bölüm dizinindeki kısa ad. */
    indexTitle: 'Klinik web sitesi',
    eyebrow: 'Klinik web sitesi',
    title: 'Kliniğinizin kendi web sitesi',
    lead: 'Panelden kendiniz kurarsınız: hazır dört tasarımdan birini seçer, metinlerinizi yazar, önizleyip yayınlarsınız. Hekimler, hizmetler, çalışma saatleri ve iletişim ayrı sayfalarda yer alır.',
    designsTitle: 'Dört hazır tasarım',
    designsNote: 'Aşağıdaki dört görüntü aynı örnek kliniğin sitesidir; yalnız tasarım değişir. Rengi, yazı tipini ve bölümleri sonra kendinize göre ayarlarsınız.',
    stepsTitle: 'Sihirbaz yedi adımda götürür',
    wizardCaption: 'Sihirbazın ilk adımı: solda klinik bilgileriniz, sağda yazdıkça güncellenen site önizlemesi',
    /** Sitenin yayınlandığı adres kalıbı; tasarım görsellerinin adres çubuğunda ve dipnotta. */
    address: 'www.vetinity.com/k/klinik-adiniz',
    addressNote: 'Siteniz Vetinity adresi altında yayınlanır. Kendi alan adınızı bağlamak şu an yoktur.',
    homeTitle: 'Kliniğinizin web sitesi de panelden',
    homeLead: 'Hazır dört tasarımdan birini seçin, metinlerinizi yazın, önizleyip yayınlayın. Sitenizdeki randevu düğmesi boş saatlerinizi gösterir.',
    homeLinkLabel: 'Dört tasarımı ve adımları görün'
} as const;

export function publicSiteShowcasePlans(): string {
    return planAvailabilityText('clinicSite');
}

export interface PublicSiteDesignDef {
    /** Site motorundaki konsept anahtarı (`SITE_CONCEPTS`); ad sihirbazdaki adla aynıdır. */
    readonly key: 'modern' | 'premium' | 'friendly' | 'nature';
    readonly name: string;
    readonly note: string;
    readonly alt: string;
}

export const PUBLIC_SITE_DESIGN_SIZE = { width: 1280, height: 800 } as const;

export const PUBLIC_SITE_DESIGNS: readonly PublicSiteDesignDef[] = [
    {
        key: 'modern',
        name: 'Modern Veterinary',
        note: 'Beyaz zemin, iri başlıklar, ince çizgiler.',
        alt: 'Modern Veterinary tasarımıyla örnek klinik sitesi: beyaz zeminde büyük başlık, lacivert randevu düğmesi ve kırmızı fularlı köpek fotoğrafı'
    },
    {
        key: 'premium',
        name: 'Premium Clinic',
        note: 'Koyu zemin, pirinç rengi çizgiler, tırnaklı yazı.',
        alt: 'Premium Clinic tasarımıyla örnek klinik sitesi: koyu zeminde siyah beyaz kedi fotoğrafı, tırnaklı büyük başlık ve pirinç rengi randevu düğmesi'
    },
    {
        key: 'friendly',
        name: 'Friendly Pet Care',
        note: 'Krem zemin, dolgun renkler, yuvarlak köşeler.',
        alt: 'Friendly Pet Care tasarımıyla örnek klinik sitesi: krem zeminde kalın başlık, turuncu randevu düğmesi ve gülümseyen golden retriever fotoğrafı'
    },
    {
        key: 'nature',
        name: 'Nature & Wellness',
        note: 'Adaçayı yeşili zemin, kemerli fotoğraflar, bol boşluk.',
        alt: 'Nature & Wellness tasarımıyla örnek klinik sitesi: açık yeşil zeminde italik başlık, koyu yeşil randevu düğmesi ve kemerli çerçevede kızıl tüylü köpek fotoğrafı'
    }
];

export function publicSiteDesignSrc(design: PublicSiteDesignDef): string {
    return `/marketing/sites/klinik-sitesi-${design.key}.webp`;
}

export interface PublicSiteStepDef {
    readonly label: string;
    readonly text: string;
}

/** Sihirbazın adımları, paneldeki sırayla (`site-builder-page.component.ts`). */
export const PUBLIC_SITE_STEPS: readonly PublicSiteStepDef[] = [
    { label: 'Klinik', text: 'Sitede görünecek temel bilgiler.' },
    { label: 'Marka', text: 'Renk, yazı tipi ve biçim.' },
    { label: 'Tasarım', text: 'Dört tasarımdan biri; bölümleri tek tek değiştirirsiniz.' },
    { label: 'Sayfalar', text: 'Hangi sayfalar olsun, ana sayfada neler görünsün.' },
    { label: 'İçerik', text: 'Metinler, fotoğraflar, hekimler, hizmetler.' },
    { label: 'SEO', text: 'Adres; Google ve paylaşımlarda nasıl görüneceği.' },
    { label: 'Yayın', text: 'Eksikleri görür, yayınlar, isterseniz önceki sürüme dönersiniz.' }
];

export interface PublicSiteLinkDef {
    readonly title: string;
    readonly text: string;
    readonly icon: string;
    /** Varsa kartın altında paket etiketi. */
    readonly plans?: string;
    /** Varsa kartın altında düz bağlantı (Angular rotası olmayan sayfa). */
    readonly href?: string;
    readonly hrefLabel?: string;
}

/** Sitenin panelin geri kalanıyla bağı: randevu, Veteriner bul, klinik kaydı. */
export const PUBLIC_SITE_LINKS: readonly PublicSiteLinkDef[] = [
    {
        title: 'Randevu düğmesi sitenizde',
        text: 'Siteniz boş saatlerinizi gösterir; hasta sahibi saat seçip talep bırakır. Randevu siz onaylayınca kesinleşir.',
        icon: 'pi pi-calendar-plus',
        plans: planAvailabilityText('onlineBooking')
    },
    {
        title: "Veteriner bul'da da görünürsünüz",
        text: 'Aynı klinik bilgisiyle il ve ilçe listesinde yer alırsınız. Listelenmek sizin seçiminizdir ve ücretsizdir.',
        icon: 'pi pi-map-marker',
        href: PUBLIC_VET_FINDER_HREF,
        hrefLabel: "Veteriner bul'u açın"
    },
    {
        title: 'Bilgiyi bir kez yazarsınız',
        text: 'Ad, adres, telefon ve çalışma saatleri klinik kaydınızdan gelir; panelde değiştirdiğinizde sitenizde de değişir.',
        icon: 'pi pi-sync'
    }
];
