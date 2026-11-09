import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Vetinity panel teması — marka paleti A (turkuaz birincil). Aura'nın yapısı korunur; yalnız renk eşlemesi değişir.
 * Kontrast (WCAG 2.x): açıkta birincil #0c8079 + beyaz 4.8:1, hover #0a655f 6.9:1; koyuda birincil #42d7cd + #042f2e 8.2:1,
 * koyu kartta (#1e293b) bağlantı olarak 8.2:1. Durum renkleri açıkta 700 tonu + beyaz (başarı 5.0, uyarı 5.0, hata 6.5),
 * koyuda 400 tonu + 950 yazı (8.6 / 9.0 / 5.8).
 */

/** Logo turkuazı ton ailesi; 500 logonun kendisi (#0fa39a, beyazla 3.1:1: yalnız simge, grafik, 24 px+ başlık; metin değil). */
const LOGO_TEAL_FAMILY = {
    50: '#eefcfb',
    100: '#d8f8f6',
    200: '#b1f1ed',
    300: '#7de8e1',
    400: '#42d7cd',
    500: '#0fa39a',
    600: '#0c8079',
    700: '#0a655f',
    800: '#084f4a',
    900: '#073f3b',
    950: '#042a27'
};

/** PrimeNG durum adı → Tailwind renk ailesi. Aura uyarıda turuncu/sarı kullanır; Vetinity'de her bileşende amber. */
const STATUS_TONES = { success: 'green', warn: 'amber', danger: 'red' } as const;

type StatusSeverity = keyof typeof STATUS_TONES;

/** Her durum için aynı biçimli belirteç kümesi üretir (`{ success: …, warn: …, danger: … }`). */
function perStatus<T>(build: (tone: string) => T): Record<StatusSeverity, T> {
    return {
        success: build(STATUS_TONES.success),
        warn: build(STATUS_TONES.warn),
        danger: build(STATUS_TONES.danger)
    };
}

const lightSolidButton = (t: string) => ({
    background: `{${t}.700}`,
    hoverBackground: `{${t}.800}`,
    activeBackground: `{${t}.900}`,
    borderColor: `{${t}.700}`,
    hoverBorderColor: `{${t}.800}`,
    activeBorderColor: `{${t}.900}`,
    color: '#ffffff',
    hoverColor: '#ffffff',
    activeColor: '#ffffff',
    focusRing: { color: `{${t}.700}`, shadow: 'none' }
});

const darkSolidButton = (t: string) => ({
    background: `{${t}.400}`,
    hoverBackground: `{${t}.300}`,
    activeBackground: `{${t}.200}`,
    borderColor: `{${t}.400}`,
    hoverBorderColor: `{${t}.300}`,
    activeBorderColor: `{${t}.200}`,
    color: `{${t}.950}`,
    hoverColor: `{${t}.950}`,
    activeColor: `{${t}.950}`,
    focusRing: { color: `{${t}.400}`, shadow: 'none' }
});

const darkTint = (t: string, transparency: number) => `color-mix(in srgb, {${t}.400}, transparent ${transparency}%)`;

const lightMessage = (t: string) => ({
    background: `color-mix(in srgb, {${t}.50}, transparent 5%)`,
    borderColor: `{${t}.200}`,
    color: `{${t}.700}`,
    shadow: `0px 4px 8px 0px color-mix(in srgb, {${t}.500}, transparent 96%)`,
    closeButton: { hoverBackground: `{${t}.100}`, focusRing: { color: `{${t}.700}`, shadow: 'none' } },
    outlined: { color: `{${t}.700}`, borderColor: `{${t}.700}` },
    simple: { color: `{${t}.700}` }
});

const darkMessage = (t: string) => ({
    background: `color-mix(in srgb, {${t}.500}, transparent 84%)`,
    borderColor: `color-mix(in srgb, {${t}.700}, transparent 64%)`,
    color: `{${t}.400}`,
    shadow: `0px 4px 8px 0px color-mix(in srgb, {${t}.500}, transparent 96%)`,
    closeButton: { hoverBackground: 'rgba(255, 255, 255, 0.05)', focusRing: { color: `{${t}.400}`, shadow: 'none' } },
    outlined: { color: `{${t}.400}`, borderColor: `{${t}.400}` },
    simple: { color: `{${t}.400}` }
});

/** p-message'da hata `error` adını taşır. */
function messageTones(build: (tone: string) => object) {
    const { success, warn, danger } = perStatus(build);

    return { success, warn, error: danger };
}

export const VetinityPreset = definePreset(Aura, {
    semantic: {
        primary: LOGO_TEAL_FAMILY,
        colorScheme: {
            light: {
                primary: { color: '{primary.600}', contrastColor: '#ffffff', hoverColor: '{primary.700}', activeColor: '{primary.800}' },
                text: { color: '{surface.900}', hoverColor: '{surface.950}', mutedColor: '{surface.600}', hoverMutedColor: '{surface.700}' }
            },
            dark: {
                /*
                 * Koyu slate rampası bir basamak kaydırılır: Aura koyu temada kartı surface-900, zemini surface-950, kenarlığı
                 * surface-700 çizer (şablonlardaki `dark:bg-surface-900` / `dark:border-surface-700` de öyle). Böylece kart #1e293b,
                 * zemin #0f172a, kenarlık #334155 olur; 800 (hover, iç blok) slate-800 ile slate-700 arası ara tondur.
                 */
                surface: {
                    0: '#ffffff',
                    50: '{slate.50}',
                    100: '{slate.100}',
                    200: '{slate.200}',
                    300: '{slate.300}',
                    400: '{slate.400}',
                    500: '{slate.500}',
                    600: '{slate.600}',
                    700: '{slate.700}',
                    800: '#283548',
                    900: '{slate.800}',
                    950: '{slate.900}'
                },
                primary: { color: '{primary.400}', contrastColor: '#042f2e', hoverColor: '{primary.300}', activeColor: '{primary.200}' },
                text: { color: '{surface.100}', hoverColor: '{surface.0}', mutedColor: '{surface.400}', hoverMutedColor: '{surface.300}' }
            }
        }
    },
    components: {
        button: {
            colorScheme: {
                light: {
                    root: perStatus(lightSolidButton),
                    outlined: perStatus((t) => ({ hoverBackground: `{${t}.50}`, activeBackground: `{${t}.100}`, borderColor: `{${t}.200}`, color: `{${t}.700}` })),
                    text: perStatus((t) => ({ hoverBackground: `{${t}.50}`, activeBackground: `{${t}.100}`, color: `{${t}.700}` }))
                },
                dark: {
                    root: perStatus(darkSolidButton),
                    outlined: perStatus((t) => ({ hoverBackground: darkTint(t, 96), activeBackground: darkTint(t, 84), borderColor: `{${t}.700}`, color: `{${t}.400}` })),
                    text: perStatus((t) => ({ hoverBackground: darkTint(t, 96), activeBackground: darkTint(t, 84), color: `{${t}.400}` }))
                }
            }
        },
        tag: {
            colorScheme: {
                light: { warn: { background: '{amber.100}', color: '{amber.700}' } },
                dark: { warn: { background: 'color-mix(in srgb, {amber.500}, transparent 84%)', color: '{amber.300}' } }
            }
        },
        message: {
            colorScheme: {
                light: messageTones(lightMessage),
                dark: messageTones(darkMessage)
            }
        }
    }
});
