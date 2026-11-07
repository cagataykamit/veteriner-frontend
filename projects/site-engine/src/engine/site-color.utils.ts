/** Renk yardımcıları: kontrast hesabı, karıştırma, ton. Token üretimi, uyarılar ve otomatik öneri bunları ortak kullanır. */
export interface Rgb {
    readonly r: number;
    readonly g: number;
    readonly b: number;
}

export interface Hsl {
    readonly h: number;
    readonly s: number;
    readonly l: number;
}

export function isHex(value: string): boolean {
    return /^#[0-9a-f]{6}$/i.test(value.trim());
}

export function hexToRgb(hex: string): Rgb {
    const value = isHex(hex) ? hex.trim().slice(1) : '000000';

    return { r: parseInt(value.slice(0, 2), 16), g: parseInt(value.slice(2, 4), 16), b: parseInt(value.slice(4, 6), 16) };
}

export function rgbToHex({ r, g, b }: Rgb): string {
    return `#${[r, g, b].map((part) => Math.round(Math.min(255, Math.max(0, part))).toString(16).padStart(2, '0')).join('')}`;
}

function channel(value: number): number {
    const v = value / 255;

    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
    const { r, g, b } = hexToRgb(hex);

    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG kontrast oranı. */
export function contrast(a: string, b: string): number {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);

    return (light + 0.05) / (dark + 0.05);
}

/** `amount` 0 ise `a`, 1 ise `b`. */
export function mix(a: string, b: string, amount: number): string {
    const x = hexToRgb(a);
    const y = hexToRgb(b);

    return rgbToHex({ r: x.r + (y.r - x.r) * amount, g: x.g + (y.g - x.g) * amount, b: x.b + (y.b - x.b) * amount });
}

/** Üstüne yazılacak metin: beyaz ya da koyu; ikisinden biri her renkte 4.5:1'i geçer. */
export function readableOn(background: string): string {
    return contrast('#ffffff', background) >= contrast('#111111', background) ? '#ffffff' : '#111111';
}

/** Renk zeminde okunmuyorsa zeminin tersine doğru adım adım kaydırır; seçilen ton mümkün olduğunca korunur. */
export function ensureContrast(color: string, background: string, ratio = 4.5): string {
    const target = luminance(background) > 0.18 ? '#000000' : '#ffffff';

    for (let step = 0; step <= 20; step++) {
        const candidate = mix(color, target, step / 20);

        if (contrast(candidate, background) >= ratio) return candidate;
    }

    return target;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
    const [x, y, z] = [r / 255, g / 255, b / 255];
    const max = Math.max(x, y, z);
    const min = Math.min(x, y, z);
    const l = (max + min) / 2;
    const d = max - min;

    if (d === 0) return { h: 0, s: 0, l };

    const s = d / (1 - Math.abs(2 * l - 1));
    const h = max === x ? ((y - z) / d) % 6 : max === y ? (z - x) / d + 2 : (x - y) / d + 4;

    return { h: (h * 60 + 360) % 360, s, l };
}

export function hslToHex({ h, s, l }: Hsl): string {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];

    return rgbToHex({ r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 });
}

export function hexToHsl(hex: string): Hsl {
    return rgbToHsl(hexToRgb(hex));
}
