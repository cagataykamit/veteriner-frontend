/** Tanıtım sitesi adresleri ve menü bağlantıları — tek liste (tasarım belgesi bölüm 4, öneri belgesi bölüm 2). */

export const PUBLIC_PATHS = {
    home: '/',
    features: '/ozellikler',
    registersAndKvkk: '/kayit-defterleri-ve-kvkk',
    migration: '/gecis',
    packages: '/paketler',
    faq: '/sss',
    contact: '/iletisim',
    about: '/hakkimizda'
} as const;

/**
 * Veteriner bul (ADR-047): hasta sahibine yönelik sayfa ayrı `site` projesinden (sunucu tarafı) sunulur,
 * Angular yönlendiricisinde yoktur; bu yüzden `routerLink` değil düz `href` ile açılır.
 */
export const PUBLIC_VET_FINDER_HREF = '/veteriner';
export const PUBLIC_VET_FINDER_LABEL = 'Veteriner bul';

export interface PublicNavLinkDef {
    readonly label: string;
    readonly routerLink: string;
    /** Sayfa içi bölüm kimliği (ör. `/ozellikler#gelis`). */
    readonly fragment?: string;
    /** Açılır menüde etiketin altındaki kısa açıklama. */
    readonly description?: string;
}

export interface PublicNavItemDef extends PublicNavLinkDef {
    /** Varsa öğe açılır menüdür; `routerLink` son alt öğe ("Tüm …") olarak da listelenir. */
    readonly children?: readonly PublicNavLinkDef[];
}

/** Özellikler açılır menüsü: /ozellikler bölüm kimlikleri (`public-features-content.utils.ts`). */
const PUBLIC_FEATURE_NAV_CHILDREN: readonly PublicNavLinkDef[] = [
    {
        label: 'Klinik web siteniz ve online randevu',
        routerLink: PUBLIC_PATHS.features,
        fragment: 'hasta-sahibi',
        description: "Hasta sahibi sizi Veteriner bul'da da bulur"
    },
    { label: 'Geliş ve muayene', routerLink: PUBLIC_PATHS.features, fragment: 'gelis' },
    { label: 'Tahsilat ve stok', routerLink: PUBLIC_PATHS.features, fragment: 'tahsilat' },
    { label: 'Raporlar ve gün sonu', routerLink: PUBLIC_PATHS.features, fragment: 'raporlar' },
    { label: 'Klinik içi araçlar', routerLink: PUBLIC_PATHS.features, fragment: 'klinik-ici' },
    { label: 'Tüm özellikler', routerLink: PUBLIC_PATHS.features }
];

/** Üst çubuk: Özellikler ▾ · Defterler ve KVKK · Geçiş · Paketler · İletişim. SSS alt bilgide. */
export const PUBLIC_NAV_ITEMS: readonly PublicNavItemDef[] = [
    { label: 'Özellikler', routerLink: PUBLIC_PATHS.features, children: PUBLIC_FEATURE_NAV_CHILDREN },
    { label: 'Defterler ve KVKK', routerLink: PUBLIC_PATHS.registersAndKvkk },
    { label: 'Geçiş', routerLink: PUBLIC_PATHS.migration },
    { label: 'Paketler', routerLink: PUBLIC_PATHS.packages },
    { label: 'İletişim', routerLink: PUBLIC_PATHS.contact }
];

/** Alt bilgi "Ürün" sütunu. */
export const PUBLIC_FOOTER_PRODUCT_LINKS: readonly PublicNavLinkDef[] = [
    { label: 'Özellikler', routerLink: PUBLIC_PATHS.features },
    { label: 'Defterler ve KVKK', routerLink: PUBLIC_PATHS.registersAndKvkk },
    { label: 'Geçiş', routerLink: PUBLIC_PATHS.migration },
    { label: 'Paketler', routerLink: PUBLIC_PATHS.packages }
];

/** Alt bilgi "Destek" sütunu (kullanıcı kılavuzu herkese açık yayımlanınca eklenir). */
export const PUBLIC_FOOTER_SUPPORT_LINKS: readonly PublicNavLinkDef[] = [
    { label: 'SSS', routerLink: PUBLIC_PATHS.faq },
    { label: 'İletişim', routerLink: PUBLIC_PATHS.contact },
    { label: 'Hakkımızda', routerLink: PUBLIC_PATHS.about }
];

/** Ana içeriğin kimliği; "İçeriğe atla" bağlantısı buraya odaklanır. */
export const PUBLIC_MAIN_CONTENT_ID = 'icerik';
