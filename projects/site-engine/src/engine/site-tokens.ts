import type { GroundKey, RadiusKey, SiteDesign } from '../model/site.model';
import { contrast, ensureContrast, isHex, luminance, mix, readableOn } from './site-color.utils';
import { type ButtonStyle, conceptByKey } from './site-concepts';
import { fontByKey } from './site-fonts';

/**
 * Ortak token sözleşmesi. Bölümler renk, yazı, köşe, düğme ve boşluğu yalnız bu `--s-*` değişkenlerinden alır; sabit renk yazmaz.
 * Dört konsept tek düzeni paylaşır ve yalnız burada ayrılır (K-01). Üstünde metin okunan her çift burada 4.5:1 geçecek biçimde
 * üretilir; seçilen renk zayıfsa metin rengi kaydırılır, klinik uyarıyı sihirbazda görür.
 *
 * - Zemin: --s-bg, --s-surface, --s-ink, --s-muted, --s-line
 * - Renk: --s-primary/--s-on-primary, --s-secondary/--s-on-secondary, --s-accent/--s-on-accent
 * - Zeminde okunan renk: --s-primary-text, --s-secondary-text, --s-accent-text
 * - Yumuşak yüzey (üst çubuk ve giriş bölümü): --s-tint/--s-on-tint, --s-tint-muted, --s-tint-primary
 * - Durum metni: --s-ok (açık), --s-warn (mola); çerçeve: --s-line-strong; koyu zeminde logo plakası: --s-logo-plate, --s-logo-pad
 * - Yazı: --s-head, --s-body, --s-head-weight, --s-head-track, --s-head-leading, --s-head-style, --s-head-scale
 * - Biçim: --s-radius (kart ve denetim), --s-radius-img; boşluk: --s-gutter, --s-space, --s-max
 * - Düğme: --s-radius-btn, --s-btn-case, --s-btn-track, --s-btn-size, --s-btn-weight
 */
export const GROUNDS: readonly { readonly key: GroundKey; readonly label: string; readonly bg: string; readonly ink: string }[] = [
    { key: 'beyaz', label: 'Beyaz', bg: '#ffffff', ink: '#14171a' },
    { key: 'kagit', label: 'Kâğıt', bg: '#f7f5ef', ink: '#1c1b18' },
    { key: 'krem', label: 'Krem', bg: '#fff3e3', ink: '#2b1c13' },
    { key: 'adacayi', label: 'Adaçayı', bg: '#eff2e7', ink: '#1d2a21' },
    { key: 'gece', label: 'Gece', bg: '#100f0d', ink: '#f3efe6' }
];

const RADII: Readonly<Record<RadiusKey, { readonly control: string; readonly image: string }>> = {
    keskin: { control: '2px', image: '2px' },
    yumusak: { control: '12px', image: '16px' },
    yuvarlak: { control: '22px', image: '28px' }
};

/** `etiket` düğmenin köşesi kliniğin köşe seçimini izler; `hap` her zaman tam yuvarlaktır. */
const BUTTONS: Readonly<Record<ButtonStyle, { readonly pill: boolean; readonly textCase: string; readonly track: string; readonly size: string; readonly weight: string }>> = {
    hap: { pill: true, textCase: 'none', track: '0', size: '16px', weight: '600' },
    etiket: { pill: false, textCase: 'uppercase', track: '0.1em', size: '14px', weight: '500' }
};

export const RADIUS_OPTIONS: readonly { readonly key: RadiusKey; readonly label: string }[] = [
    { key: 'keskin', label: 'Keskin' },
    { key: 'yumusak', label: 'Yumuşak' },
    { key: 'yuvarlak', label: 'Yuvarlak' }
];

export function groundOf(key: GroundKey): (typeof GROUNDS)[number] {
    return GROUNDS.find((ground) => ground.key === key) ?? GROUNDS[0];
}

/** Renk CSS değişkenine yazılır: yalnız `#rrggbb` geçer, başka değer (`url(...)` gibi) konseptin rengine düşer. */
function safeColors(design: SiteDesign): SiteDesign['colors'] {
    const fallback = conceptByKey(design.conceptKey).colors;
    const pick = (value: string, other: string): string => (isHex(value) ? value.trim() : other);

    return { primary: pick(design.colors.primary, fallback.primary), secondary: pick(design.colors.secondary, fallback.secondary), accent: pick(design.colors.accent, fallback.accent) };
}

export function buildSiteTokens(design: SiteDesign): Record<string, string> {
    const { bg, ink } = groundOf(design.ground);
    const { primary, secondary, accent } = safeColors(design);
    const dark = luminance(bg) < 0.18;
    const surface = mix(bg, ink, dark ? 0.07 : 0.04);
    const tint = mix(bg, primary, dark ? 0.16 : 0.1);
    const muted = ensureContrast(mix(ink, bg, 0.36), surface);
    const concept = conceptByKey(design.conceptKey);
    const button = BUTTONS[concept.button] ?? BUTTONS.hap;
    const head = fontByKey(design.headFont);
    const body = fontByKey(design.bodyFont);
    const radius = RADII[design.radius] ?? RADII.yumusak;

    return {
        '--s-bg': bg,
        '--s-surface': surface,
        '--s-ink': ink,
        '--s-muted': muted,
        '--s-line': mix(bg, ink, dark ? 0.2 : 0.16),
        '--s-line-strong': mix(bg, ink, dark ? 0.4 : 0.34),
        '--s-primary': primary,
        '--s-on-primary': readableOn(primary),
        '--s-primary-text': ensureContrast(primary, surface),
        '--s-secondary': secondary,
        '--s-on-secondary': readableOn(secondary),
        '--s-secondary-text': ensureContrast(secondary, surface),
        '--s-accent': accent,
        '--s-on-accent': readableOn(accent),
        '--s-accent-text': ensureContrast(accent, surface),
        '--s-tint': tint,
        '--s-on-tint': ensureContrast(ink, tint, 7),
        '--s-tint-muted': ensureContrast(muted, tint),
        '--s-tint-primary': ensureContrast(primary, tint),
        '--s-ok': ensureContrast(dark ? '#6fd39a' : '#17713f', bg),
        '--s-warn': ensureContrast(dark ? '#f0c36b' : '#8a5a00', bg),
        '--s-focus': ensureContrast(primary, bg),
        '--s-logo-plate': dark ? '#ffffff' : 'transparent',
        '--s-logo-pad': dark ? '4px' : '0px',
        '--s-head': head.stack,
        '--s-body': body.stack,
        '--s-head-weight': String(head.weight),
        '--s-head-track': head.tracking,
        '--s-head-leading': String(head.leading),
        '--s-head-style': 'normal',
        '--s-head-scale': String(head.scale),
        '--s-radius': radius.control,
        '--s-radius-img': radius.image,
        '--s-radius-btn': button.pill ? '999px' : radius.control,
        '--s-btn-case': button.textCase,
        '--s-btn-track': button.track,
        '--s-btn-size': button.size,
        '--s-btn-weight': button.weight,
        '--s-gutter': 'clamp(20px, 3.2cqi, 40px)',
        // Bölümler arası boşluk iki bölümün payı toplanınca masaüstünde büyük bant oluyordu (W-04); en çok 2 × 88 px.
        '--s-space': 'clamp(56px, 7cqi, 88px)',
        '--s-max': '1260px',
        'color-scheme': dark ? 'dark' : 'light'
    };
}

export interface ContrastWarning {
    readonly text: string;
}

/**
 * Seçilen renklerin zeminle ilişkisi: otomatik düzeltilse de klinik bilmeli. İkincil renk çoğunlukla zemindir, üstündeki yazı
 * `--s-on-secondary` ile okunur; bu yüzden burada uyarı vermez.
 */
export function colorWarnings(design: SiteDesign): readonly ContrastWarning[] {
    const { bg } = groundOf(design.ground);
    const { primary, accent } = design.colors;

    const check = (label: string, color: string): ContrastWarning | null => {
        const ratio = contrast(color, bg);

        return ratio < 4.5 ? { text: `${label} zeminde ${ratio.toFixed(1)}:1 kontrastta kalıyor (en az 4.5:1). Metinlerde otomatik olarak ${ensureContrast(color, bg)} kullanılıyor.` } : null;
    };

    return [check('Ana renk', primary), check('Vurgu rengi', accent)].filter((warning): warning is ContrastWarning => warning !== null);
}
