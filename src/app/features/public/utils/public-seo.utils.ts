import { Meta, Title } from '@angular/platform-browser';
import { PUBLIC_PATHS } from './public-navigation.utils';

export interface PublicPageMetaOptions {
    readonly title: string;
    readonly description: string;
    /** Örn. `/` veya `/paketler` — verilirse `link[rel=canonical]` güncellenir. */
    readonly canonicalPath?: string;
    readonly noindex?: boolean;
}

/** Sayfa başına başlık ve açıklama (öneri belgesi 6.2). */
export const PUBLIC_HOME_PAGE_META: PublicPageMetaOptions = {
    title: 'Vetinity — Veteriner klinik programı: günün akışı, kayıt defterleri, KVKK',
    description:
        'Veteriner kliniğinizin gününü tek ekranda yönetin: geliş, muayene, tahsilat, aşı ve ilaç kayıt defterleri, KVKK formları. 14 gün ücretsiz, kart gerekmez.',
    canonicalPath: PUBLIC_PATHS.home
};

export const PUBLIC_FEATURES_PAGE_META: PublicPageMetaOptions = {
    title: 'Özellikler — Gelişten tahsilata bir günün akışı · Vetinity',
    description: "Randevu ve randevusuz geliş, bekleme sırası, muayene, reçete, stok, tahsilat ve gün sonu: Vetinity'de bir ziyaretin yolculuğu.",
    canonicalPath: PUBLIC_PATHS.features
};

export const PUBLIC_REGISTERS_PAGE_META: PublicPageMetaOptions = {
    title: 'Kayıt defterleri ve KVKK — Vetinity',
    description:
        'Aşı, ilaç, narkotik/psikotropik, muayene ve reçete defterleri otomatik; KVKK aydınlatma ve açık rıza formları, rıza kaydı ve veri kopyası.',
    canonicalPath: PUBLIC_PATHS.registersAndKvkk
};

export const PUBLIC_MIGRATION_PAGE_META: PublicPageMetaOptions = {
    title: 'Eski programdan geçiş — Vetinity',
    description: 'Excel veya CSV ile müşteri, hasta ve aşı geçmişinizi aktarın: sütun eşleme, kontrol, geri alma.',
    canonicalPath: PUBLIC_PATHS.migration
};

export const PUBLIC_PACKAGES_PAGE_META: PublicPageMetaOptions = {
    title: 'Paketler ve fiyat — Vetinity',
    description: 'Veteriner kliniğiniz için Vetinity pilot dönemi paketi: tüm özellikler dahil, 14 gün ücretsiz deneme; pilot dönemi fiyatı için yazın.',
    canonicalPath: PUBLIC_PATHS.packages
};

export const PUBLIC_FAQ_PAGE_META: PublicPageMetaOptions = {
    title: 'Sık sorulan sorular — Vetinity',
    description: 'Fiyat, veri güvenliği, geçiş, destek, sözleşme ve deneme hakkında yanıtlar.',
    canonicalPath: PUBLIC_PATHS.faq
};

export const PUBLIC_CONTACT_PAGE_META: PublicPageMetaOptions = {
    title: 'İletişim ve demo talebi — Vetinity',
    description: 'Demo isteyin, pilot dönemi fiyatını sorun ya da geçiş dosyanıza birlikte bakalım.',
    canonicalPath: PUBLIC_PATHS.contact
};

export const PUBLIC_ABOUT_PAGE_META: PublicPageMetaOptions = {
    title: 'Hakkımızda ve destek — Vetinity',
    description: "Vetinity'yi kim yapıyor, destek kanalı ve hukuki metinler.",
    canonicalPath: PUBLIC_PATHS.about
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
