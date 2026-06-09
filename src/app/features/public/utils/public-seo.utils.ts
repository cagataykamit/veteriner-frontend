import { Meta, Title } from '@angular/platform-browser';

export interface PublicPageMetaOptions {
    readonly title: string;
    readonly description: string;
    /** Örn. `/` veya `/pricing` — verilirse `link[rel=canonical]` güncellenir. */
    readonly canonicalPath?: string;
    readonly noindex?: boolean;
}

export const PUBLIC_HOME_PAGE_META: PublicPageMetaOptions = {
    title: 'Vetinity — Klinik yönetim platformu',
    description:
        'Veteriner klinikleri için randevu, hasta kayıtları, muayene, aşı, ödeme ve stok süreçlerini tek panelden yönetin. Çok klinikli yapı ve rol bazlı erişim.',
    canonicalPath: '/'
};

export const PUBLIC_PRICING_PAGE_META: PublicPageMetaOptions = {
    title: 'Paketler — Vetinity',
    description:
        'Kliniğinizin büyüklüğüne göre Basic, Pro veya Premium paket seçin. Ücretsiz deneme ile başlayın; fiyat bilgisi yakında paylaşılacaktır.',
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
