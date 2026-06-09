/** Vetinity marka varlıkları — `src/assets/brand/vetinity/` */
export const VETINITY_BRAND_LOGOS = {
    /** Ana logo: ikon + Vetinity (auth, açık zemin) */
    logoFull: 'assets/brand/vetinity/vetinity-logo.svg',
    /** Yalnız ikon (favicon, panel dar görünüm) */
    icon: 'assets/brand/vetinity/vetinity-icon.svg',
    /** Yalnız wordmark (açık zemin, metin odaklı alanlar) */
    wordmark: 'assets/brand/vetinity/vetinity-wordmark.svg',
    /** Açık zemin lockup (public topbar light, panel geniş görünüm) */
    compactLockup: 'assets/brand/vetinity/vetinity-compact.svg',
    /** Koyu zemin reverse lockup — aynı marka, açık wordmark + teal ikon, şeffaf zemin */
    logoDark: 'assets/brand/vetinity/vetinity-logo-dark.svg'
} as const;

/** Açık zeminlerde kullanılan standart public topbar logosu */
export const VETINITY_LOGO_LIGHT_PATH = VETINITY_BRAND_LOGOS.compactLockup;

/** Koyu zeminlerde kullanılan reverse logo (dark mode topbar, footer gradient) */
export const VETINITY_LOGO_DARK_PATH = VETINITY_BRAND_LOGOS.logoDark;
