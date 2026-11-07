/**
 * Yazı tipi seçenekleri. Dosyalar bizim sunucudan gelir (ADR-045 K12, `styles/site-fonts.css`, `@fontsource-variable`, OFL-1.1), üçüncü
 * taraf font bağlantısı yoktur. Aile adları paketin değişken font adlarıdır; latin-ext kümesi Türkçe için gereklidir (ğ, ş, İ).
 */
export interface SiteFont {
    readonly key: string;
    readonly label: string;
    readonly stack: string;
    readonly weight: number;
    readonly tracking: string;
    readonly leading: number;
    /** Küçük görünen tırnaklı yazılarda başlık boyutu çarpanı. */
    readonly scale: number;
    readonly forHeading: boolean;
    readonly forBody: boolean;
}

const SANS = "system-ui, 'Segoe UI', Roboto, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

export const SITE_FONTS: readonly SiteFont[] = [
    { key: 'instrument', label: 'Instrument Sans', stack: `'Instrument Sans Variable', ${SANS}`, weight: 500, tracking: '-0.035em', leading: 1.02, scale: 1, forHeading: true, forBody: true },
    { key: 'manrope', label: 'Manrope', stack: `'Manrope Variable', ${SANS}`, weight: 700, tracking: '-0.035em', leading: 1.04, scale: 0.96, forHeading: true, forBody: true },
    { key: 'cormorant', label: 'Cormorant Garamond', stack: `'Cormorant Garamond Variable', ${SERIF}`, weight: 500, tracking: '-0.012em', leading: 1, scale: 1.16, forHeading: true, forBody: false },
    { key: 'newsreader', label: 'Newsreader', stack: `'Newsreader Variable', ${SERIF}`, weight: 400, tracking: '-0.022em', leading: 1.04, scale: 1.04, forHeading: true, forBody: false },
    { key: 'fraunces', label: 'Fraunces', stack: `'Fraunces Variable', ${SERIF}`, weight: 500, tracking: '-0.025em', leading: 1.02, scale: 0.98, forHeading: true, forBody: false },
    { key: 'bricolage', label: 'Bricolage Grotesque', stack: `'Bricolage Grotesque Variable', ${SANS}`, weight: 700, tracking: '-0.03em', leading: 1, scale: 1, forHeading: true, forBody: false },
    { key: 'jost', label: 'Jost', stack: `'Jost Variable', ${SANS}`, weight: 400, tracking: '0em', leading: 1.1, scale: 1, forHeading: false, forBody: true },
    { key: 'figtree', label: 'Figtree', stack: `'Figtree Variable', ${SANS}`, weight: 400, tracking: '0em', leading: 1.1, scale: 1, forHeading: false, forBody: true },
    { key: 'karla', label: 'Karla', stack: `'Karla Variable', ${SANS}`, weight: 400, tracking: '0em', leading: 1.1, scale: 1, forHeading: false, forBody: true }
];

export function fontByKey(key: string): SiteFont {
    return SITE_FONTS.find((font) => font.key === key) ?? SITE_FONTS[0];
}
