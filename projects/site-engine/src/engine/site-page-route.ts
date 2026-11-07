import type { PageKey } from '../model/site.model';
import type { ArticleVm, ServiceVm, SiteVm } from './site-vm';

export type SitePage =
    | { readonly kind: 'home' }
    | { readonly kind: 'notfound' }
    | { readonly kind: 'hakkimizda' | 'hizmetler' | 'hekimler' | 'ekibimiz' | 'rehber' | 'galeri' | 'iletisim' | 'randevu' | 'acil' | 'sss' | 'subeler' }
    | { readonly kind: 'hizmet'; readonly service: ServiceVm }
    | { readonly kind: 'yazi'; readonly article: ArticleVm };

const ROUTES: Readonly<Record<string, Extract<PageKey, SitePage['kind']> | 'rehber'>> = {
    hakkimizda: 'hakkimizda',
    hizmetler: 'hizmetler',
    hekimler: 'hekimler',
    ekibimiz: 'ekibimiz',
    'saglik-rehberi': 'rehber',
    galeri: 'galeri',
    iletisim: 'iletisim',
    randevu: 'randevu',
    acil: 'acil',
    sss: 'sss',
    subelerimiz: 'subeler'
};

/** Yolu sayfaya çevirir. Kapatılmış, boş ya da olmayan sayfa "bulunamadı" olur; site boş açılmaz. */
export function resolveSitePage(path: string, vm: SiteVm): SitePage {
    const [first, second] = path.split('#')[0].split('/').filter(Boolean);

    if (!first) return { kind: 'home' };

    const kind = Object.hasOwn(ROUTES, first) ? ROUTES[first] : undefined;

    if (!kind || !vm.pages[kind]) return { kind: 'notfound' };

    if (second && kind === 'hizmetler') {
        const service = vm.services.find((item) => item.slug === second);

        return service && vm.pages.hizmetDetay ? { kind: 'hizmet', service } : { kind: 'notfound' };
    }

    if (second && kind === 'rehber') {
        const article = vm.articles.find((item) => item.slug === second);

        return article ? { kind: 'yazi', article } : { kind: 'notfound' };
    }

    return second ? { kind: 'notfound' } : ({ kind } as SitePage);
}

export interface PageHeading {
    readonly title: string;
    readonly lead: string;
    readonly back: { readonly label: string; readonly path: string } | null;
}

/** Alt sayfa başlığı: sayfanın kendisi ve `<title>` aynı metni kullanır. */
export function pageHeading(page: SitePage, v: SiteVm): PageHeading | null {
    switch (page.kind) {
        case 'hakkimizda':
            return { title: 'Hakkımızda', lead: v.intro, back: null };
        case 'hizmetler':
            return { title: v.copy.servicesTitle, lead: v.copy.servicesIntro, back: null };
        case 'hekimler':
            return { title: v.copy.teamTitle, lead: v.copy.teamIntro, back: null };
        case 'ekibimiz':
            return { title: 'Ekibimiz', lead: 'Hekimler ve onlarla çalışan ekip.', back: null };
        case 'rehber':
            return { title: v.copy.guideTitle, lead: 'Genel bilgilendirme yazılarıdır; hayvanınız için hekiminize danışın.', back: null };
        case 'galeri':
            return { title: v.copy.galleryTitle, lead: '', back: null };
        case 'iletisim':
            return { title: v.copy.contactTitle, lead: v.copy.contactText, back: null };
        case 'randevu':
            return { title: v.copy.ctaPrimary, lead: v.bookingHref ? 'Talebiniz klinik onaylayınca randevuya dönüşür.' : v.telHref ? 'Uygun gün ve saati telefonda birlikte belirleyelim.' : '', back: null };
        case 'acil':
            return { title: 'Acil durumda', lead: '', back: null };
        case 'sss':
            return { title: 'Sıkça sorulan sorular', lead: '', back: null };
        case 'subeler':
            return { title: 'Şubelerimiz', lead: '', back: null };
        case 'hizmet':
            return { title: page.service.title, lead: page.service.summary, back: v.pages.hizmetler ? { label: 'Hizmetler', path: '/hizmetler' } : null };
        case 'yazi':
            return { title: page.article.title, lead: page.article.summary, back: v.pages.rehber ? { label: v.copy.guideTitle, path: '/saglik-rehberi' } : null };
        default:
            return null;
    }
}
