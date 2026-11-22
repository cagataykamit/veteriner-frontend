import { computed, effect, Injectable, signal } from '@angular/core';

/** `system`: cihazın açık/koyu ayarını izler (varsayılan). `light` / `dark`: Hesabım > Görünüm'den sabitlenir. */
export type PortalThemePreference = 'system' | 'light' | 'dark';

/** Tercih bu cihaza özeldir; `index.html` başlangıç betiği de aynı anahtarı okur (ilk boyamada göz kırpmasın). */
export const PORTAL_THEME_STORAGE_KEY = 'vetinity-portal-theme';

/** PrimeNG `darkModeSelector` (`app.config.ts`) ve `styles.scss` `:root.portal-dark` ile aynı sınıf. */
export const PORTAL_DARK_CLASS = 'portal-dark';

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

/**
 * Portal teması (panelle aynı desen: kök öğede sınıf, tercih cihazda). Panelden farkı: tercih yoksa cihaz temasını izler;
 * hasta sahibi portalı çoğunlukla telefonda, cihazın koyu ayarıyla açılır.
 */
@Injectable({ providedIn: 'root' })
export class PortalTheme {
    private readonly media = typeof window.matchMedia === 'function' ? window.matchMedia(DARK_MEDIA_QUERY) : null;
    private readonly systemDark = signal(this.media?.matches ?? false);

    readonly preference = signal<PortalThemePreference>(readPreference());
    readonly dark = computed(() => {
        const preference = this.preference();

        return preference === 'dark' || (preference === 'system' && this.systemDark());
    });

    constructor() {
        this.media?.addEventListener('change', (event) => this.systemDark.set(event.matches));
        effect(() => document.documentElement.classList.toggle(PORTAL_DARK_CLASS, this.dark()));
    }

    setPreference(preference: PortalThemePreference): void {
        this.preference.set(preference);

        try {
            if (preference === 'system') {
                localStorage.removeItem(PORTAL_THEME_STORAGE_KEY);
            } else {
                localStorage.setItem(PORTAL_THEME_STORAGE_KEY, preference);
            }
        } catch {
            // Depolama kapalıysa tercih bu açılışta geçerli kalır.
        }
    }
}

function readPreference(): PortalThemePreference {
    try {
        const value = localStorage.getItem(PORTAL_THEME_STORAGE_KEY);

        return value === 'light' || value === 'dark' ? value : 'system';
    } catch {
        return 'system';
    }
}
