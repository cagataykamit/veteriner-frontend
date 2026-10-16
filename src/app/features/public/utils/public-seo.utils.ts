import { Meta, Title } from '@angular/platform-browser';

export interface PublicPageMetaOptions {
    readonly title: string;
    readonly description: string;
    /** Örn. `/` veya `/pricing` — verilirse `link[rel=canonical]` güncellenir. */
    readonly canonicalPath?: string;
    readonly noindex?: boolean;
}

export const PUBLIC_HOME_PAGE_META: PublicPageMetaOptions = {
    title: 'Vetinity — Veteriner klinik programı: günün akışı, kayıt defterleri, KVKK',
    description:
        'Veteriner kliniğinizin gününü tek ekranda yönetin: geliş, muayene, tahsilat, aşı ve ilaç kayıt defterleri, KVKK formları. 14 gün ücretsiz, kart gerekmez.',
    canonicalPath: '/'
};

export const PUBLIC_PRICING_PAGE_META: PublicPageMetaOptions = {
    title: 'Paketler ve fiyat — Vetinity',
    description:
        'Veteriner kliniğiniz için Vetinity paketleri. 14 gün ücretsiz deneyin; pilot dönemi fiyatı için yazın.',
    canonicalPath: '/pricing'
};

export const AUTH_LOGIN_PAGE_META: PublicPageMetaOptions = {
    title: 'Giriş yap — Vetinity',
    description: 'Vetinity paneline giriş yapın.',
    noindex: true
};

export const AUTH_SIGNUP_PAGE_META: PublicPageMetaOptions = {
    title: 'Hesap oluştur — Vetinity',
    description: 'Veteriner kliniğiniz için ücretsiz deneme hesabı oluşturun.',
    noindex: true
};

/**
 * Public sayfa title + temel meta/OG tag'lerini günceller.
 * Panel route'larında kullanılmaz.
 */
export function setPublicPageMeta(
    title: Title,
    meta: Meta,
    options: PublicPageMetaOptions,
    document?: Document
): void {
    title.setTitle(options.title);

    meta.updateTag({ name: 'description', content: options.description });
    meta.updateTag({ property: 'og:title', content: options.title });
    meta.updateTag({ property: 'og:description', content: options.description });
    meta.updateTag({ property: 'og:type', content: 'website' });

    if (options.noindex) {
        meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    } else {
        meta.removeTag('name="robots"');
    }

    if (options.canonicalPath && document) {
        updateCanonicalLink(document, options.canonicalPath);
    }
}

function updateCanonicalLink(document: Document, path: string): void {
    const href = `${document.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
    let link = document.querySelector('link[rel="canonical"]');

    if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
    }

    link.setAttribute('href', href);
}
