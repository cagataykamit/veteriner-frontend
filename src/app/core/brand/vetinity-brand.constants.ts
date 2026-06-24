/** Vetinity marka varlıkları — `src/assets/brand/vetinity/` */
export const VETINITY_BRAND_LOGOS = {
    /** Ana logo — açık zemin (auth, büyük görünüm) */
    logoFull: 'assets/brand/vetinity/vetinity-logo.svg',
    /** Ana logo — koyu zemin / dark mode auth */
    logoFullDark: 'assets/brand/vetinity/vetinity-logo-dark.svg',
    /** Yalnız ikon (favicon, panel dar görünüm) */
    icon: 'assets/brand/vetinity/vetinity-icon.svg',
    /** Yalnız ikon — koyu zemin / dark mode */
    iconDark: 'assets/brand/vetinity/vetinity-icon-dark.svg',
    /** Yalnız wordmark (açık zemin, metin odaklı alanlar) */
    wordmark: 'assets/brand/vetinity/vetinity-wordmark.svg',
    /** Compact lockup — açık zemin (public/panel topbar light) */
    compactLockup: 'assets/brand/vetinity/vetinity-compact.svg',
    /** Compact lockup — koyu zemin (dark mode topbar, footer gradient) */
    compactLockupDark: 'assets/brand/vetinity/vetinity-compact-dark.svg'
} as const;

/** Açık zeminlerde kullanılan compact topbar logosu */
export const VETINITY_LOGO_LIGHT_PATH = VETINITY_BRAND_LOGOS.compactLockup;

/** Koyu zeminlerde kullanılan compact reverse logosu */
export const VETINITY_LOGO_DARK_PATH = VETINITY_BRAND_LOGOS.compactLockupDark;
