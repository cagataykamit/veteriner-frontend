import { Injectable, effect, signal, computed } from '@angular/core';

export interface LayoutConfig {
    preset: string;
    primary: string;
    surface: string | undefined | null;
    darkTheme: boolean;
    menuMode: string;
}

interface LayoutState {
    staticMenuDesktopInactive: boolean;
    overlayMenuActive: boolean;
    configSidebarVisible: boolean;
    mobileMenuActive: boolean;
    menuHoverActive: boolean;
    activePath: string | null;
}

export type VetinityThemePreference = 'light' | 'dark';

/** Kullanıcı dark/light tercihi — palette ile karıştırılmaz */
export const VETINITY_THEME_STORAGE_KEY = 'vetinity-theme';

/** @deprecated Eski boolean kayıt; okuma geriye dönük uyumluluk için */
const LEGACY_DARK_THEME_STORAGE_KEY = 'vetinity.darkTheme';

@Injectable({
    providedIn: 'root'
})
export class LayoutService {
    layoutConfig = signal<LayoutConfig>({
        preset: 'Aura',
        primary: 'emerald',
        surface: null,
        darkTheme: false,
        menuMode: 'static'
    });

    layoutState = signal<LayoutState>({
        staticMenuDesktopInactive: false,
        overlayMenuActive: false,
        configSidebarVisible: false,
        mobileMenuActive: false,
        menuHoverActive: false,
        activePath: null
    });

    theme = computed(() => (this.layoutConfig().darkTheme ? 'light' : 'dark'));

    isDarkTheme = computed(() => this.layoutConfig().darkTheme);

    getPrimary = computed(() => this.layoutConfig().primary);

    getSurface = computed(() => this.layoutConfig().surface);

    isOverlay = computed(() => this.layoutConfig().menuMode === 'overlay');

    transitionComplete = signal<boolean>(false);

    /**
     * Panel shell içi PrimeNG overlay append hedefi (`p-menu` vb.).
     * `document.body` yerine kullanıldığında layout destroy ile DOM birlikte temizlenir.
     */
    primePanelOverlayHost = signal<HTMLElement | null>(null);

    setPrimePanelOverlayHost(el: HTMLElement | null): void {
        this.primePanelOverlayHost.set(el);
    }

    private initialized = false;

    constructor() {
        const storedTheme = this.readStoredTheme();
        if (storedTheme !== null) {
            this.layoutConfig.update((state) => ({ ...state, darkTheme: storedTheme === 'dark' }));
        }
        this.applyDarkModeClass(this.layoutConfig().darkTheme);

        effect(() => {
            const config = this.layoutConfig();

            if (!this.initialized) {
                this.initialized = true;
                return;
            }

            this.persistStoredTheme(config.darkTheme);
            this.handleDarkModeTransition(config);
        });
    }

    setDarkTheme(enabled: boolean): void {
        if (this.layoutConfig().darkTheme === enabled) {
            return;
        }
        this.layoutConfig.update((config) => ({ ...config, darkTheme: enabled }));
    }

    toggleDarkMode(): void {
        this.setDarkTheme(!this.layoutConfig().darkTheme);
    }

    private readStoredTheme(): VetinityThemePreference | null {
        try {
            const value = localStorage.getItem(VETINITY_THEME_STORAGE_KEY);
            if (value === 'dark' || value === 'light') {
                return value;
            }

            const legacy = localStorage.getItem(LEGACY_DARK_THEME_STORAGE_KEY);
            if (legacy === 'true') {
                return 'dark';
            }
            if (legacy === 'false') {
                return 'light';
            }

            return null;
        } catch {
            return null;
        }
    }

    private persistStoredTheme(darkTheme: boolean): void {
        try {
            localStorage.setItem(VETINITY_THEME_STORAGE_KEY, darkTheme ? 'dark' : 'light');
        } catch {
            // Storage kullanılamasa bile çalışma anında tema uygulanmaya devam etsin.
        }
    }

    private handleDarkModeTransition(config: LayoutConfig): void {
        const supportsViewTransition = 'startViewTransition' in document;

        if (supportsViewTransition) {
            this.startViewTransition(config);
        } else {
            this.applyDarkModeClass(config.darkTheme);
        }
    }

    private startViewTransition(config: LayoutConfig): void {
        document.startViewTransition(() => {
            this.applyDarkModeClass(config.darkTheme);
        });
    }

    private applyDarkModeClass(enabled: boolean): void {
        document.documentElement.classList.toggle('app-dark', enabled);
    }

    onMenuToggle() {
        if (this.isOverlay()) {
            this.layoutState.update((prev) => ({ ...prev, overlayMenuActive: !this.layoutState().overlayMenuActive }));
        }

        if (this.isDesktop()) {
            this.layoutState.update((prev) => ({ ...prev, staticMenuDesktopInactive: !this.layoutState().staticMenuDesktopInactive }));
        } else {
            this.layoutState.update((prev) => ({ ...prev, mobileMenuActive: !this.layoutState().mobileMenuActive }));
        }
    }

    showConfigSidebar() {
        this.layoutState.update((prev) => ({ ...prev, configSidebarVisible: true }));
    }

    hideConfigSidebar() {
        this.layoutState.update((prev) => ({ ...prev, configSidebarVisible: false }));
    }

    isDesktop() {
        return window.innerWidth > 991;
    }

    isMobile() {
        return !this.isDesktop();
    }
}

/** `index.html` inline bootstrap — Angular yüklenmeden önce göz kırpmayı azaltır */
export function readVetinityThemePreferenceFromStorage(): VetinityThemePreference | null {
    try {
        const value = localStorage.getItem(VETINITY_THEME_STORAGE_KEY);
        if (value === 'dark' || value === 'light') {
            return value;
        }
        const legacy = localStorage.getItem(LEGACY_DARK_THEME_STORAGE_KEY);
        if (legacy === 'true') {
            return 'dark';
        }
        if (legacy === 'false') {
            return 'light';
        }
        return null;
    } catch {
        return null;
    }
}
