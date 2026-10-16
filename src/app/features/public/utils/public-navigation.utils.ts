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

export interface PublicNavLinkDef {
    readonly label: string;
    readonly routerLink: string;
}

/** Üst çubuk: Özellikler · Defterler ve KVKK · Geçiş · Paketler · SSS · İletişim. */
export const PUBLIC_NAV_LINKS: readonly PublicNavLinkDef[] = [
    { label: 'Özellikler', routerLink: PUBLIC_PATHS.features },
    { label: 'Defterler ve KVKK', routerLink: PUBLIC_PATHS.registersAndKvkk },
    { label: 'Geçiş', routerLink: PUBLIC_PATHS.migration },
    { label: 'Paketler', routerLink: PUBLIC_PATHS.packages },
    { label: 'SSS', routerLink: PUBLIC_PATHS.faq },
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
