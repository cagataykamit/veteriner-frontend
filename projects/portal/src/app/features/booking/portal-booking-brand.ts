/**
 * Kliniğe özel bağlantı sayfasının marka rengi (APPT-022; sözleşme §5 `branding`). Renk kliniğin sitesinden gelir ve sayfada
 * beyaz yazılı zemin (adım numarası, gönder düğmesi), seçili saat çerçevesi ve odak halkası olarak kullanılır. Bu yüzeylerin
 * hepsinde metin kontrastı WCAG AA (4.5:1) olmalıdır; tutmayan renk hiç uygulanmaz, sayfa Vetinity renklerinde kalır.
 */

/** Rengin üstüne ya da yanına geldiği açık yüzeyler: kart, sayfa zemini, yumuşak vurgu (`styles.scss`). */
const LIGHT_SURFACES = ['#ffffff', '#f5f7f9', '#e6f6f5'] as const;

export const PORTAL_ACCENT_MIN_CONTRAST = 4.5;

function channels(hex: string): [number, number, number] {
    const value = hex.slice(1);

    return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance(hex: string): number {
    const [r, g, b] = channels(hex).map((c) => {
        const v = c / 255;

        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG kontrast oranı. */
export function contrastRatio(a: string, b: string): number {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);

    return (light + 0.05) / (dark + 0.05);
}

function darken(hex: string, amount: number): string {
    return `#${channels(hex)
        .map((c) => Math.round(c * (1 - amount)).toString(16).padStart(2, '0'))
        .join('')}`;
}

/** Kullanılabilir vurgu rengi; biçimsiz ya da açık yüzeylerde okunmayan renkte `null` (varsayılan renkler kalır). */
export function usableAccent(color: string | null | undefined): string | null {
    const value = color?.trim().toLowerCase();

    if (!value || !/^#[0-9a-f]{6}$/.test(value)) {
        return null;
    }

    return LIGHT_SURFACES.every((surface) => contrastRatio(value, surface) >= PORTAL_ACCENT_MIN_CONTRAST) ? value : null;
}

/**
 * Sayfa köküne yazılan değişkenler. Portal ve PrimeNG değişkenleri kökte çözüldüğünden kullanılan son değişkenler (düğme
 * zemini, odak) doğrudan verilir; yazı rengi her zaman beyazdır.
 */
export function accentStyle(color: string | null | undefined): Record<string, string> | null {
    const accent = usableAccent(color);

    if (!accent) {
        return null;
    }

    const hover = darken(accent, 0.12);
    const active = darken(accent, 0.22);

    return {
        '--vetinity-navy': accent,
        '--vetinity-teal': accent,
        '--portal-focus': accent,
        '--p-button-primary-background': accent,
        '--p-button-primary-border-color': accent,
        '--p-button-primary-hover-background': hover,
        '--p-button-primary-hover-border-color': hover,
        '--p-button-primary-active-background': active,
        '--p-button-primary-active-border-color': active,
        '--p-button-primary-color': '#ffffff',
        '--p-button-primary-hover-color': '#ffffff',
        '--p-button-primary-active-color': '#ffffff',
        '--p-button-primary-focus-ring-color': accent
    };
}
