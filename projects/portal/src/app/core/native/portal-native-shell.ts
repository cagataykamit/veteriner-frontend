import { Location } from '@angular/common';
import { EnvironmentProviders, inject, Injectable, InjectionToken, provideAppInitializer } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router, type Event } from '@angular/router';
import { App, type AppPlugin } from '@capacitor/app';
import { SystemBars, SystemBarsStyle, type SystemBarsStyleOptions } from '@capacitor/core';
import { SplashScreen, type SplashScreenPlugin } from '@capacitor/splash-screen';
import { filter, take } from 'rxjs';
import { environment } from '@portal/environments/environment';
import { isPortalNativePlatform, portalBackButtonAction, portalDeepLinkPath } from './portal-native';

/** Kullanılan yerel eklenti yüzeyi; spec'lerde sahte nesneyle değiştirilir. */
export interface PortalNativePlugins {
    readonly app: Pick<AppPlugin, 'addListener' | 'exitApp'>;
    readonly splashScreen: Pick<SplashScreenPlugin, 'hide'>;
    readonly systemBars: { setStyle(options: SystemBarsStyleOptions): Promise<void> };
}

export const PORTAL_NATIVE_PLUGINS = new InjectionToken<PortalNativePlugins>('PORTAL_NATIVE_PLUGINS', {
    factory: () => ({ app: App, splashScreen: SplashScreen, systemBars: SystemBars })
});

/** Derin bağlantıların kabul edildiği portal adresi (ADR-033). */
export const PORTAL_BASE_URL = new InjectionToken<string>('PORTAL_BASE_URL', { factory: () => environment.portalBaseUrl });

const isNavigationSettled = (event: Event) => event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError;

const ignore = () => undefined;

/**
 * Mağaza uygulamasının (Capacitor) yerel davranışları; tarayıcıda (PWA) hiç başlatılmaz:
 * - derin bağlantı: portal adresindeki bağlantı (ör. davet `…/invite?token=…`) uygulama içinde açılır;
 * - Android geri tuşu: önceki ekran, kök sayfada uygulamadan çıkış;
 * - sistem çubuğu içeriği koyu (portal açık zeminli); açılış ekranı ilk yönlendirme bitince kapanır.
 */
@Injectable({ providedIn: 'root' })
export class PortalNativeShell {
    private readonly router = inject(Router);
    private readonly location = inject(Location);
    private readonly plugins = inject(PORTAL_NATIVE_PLUGINS);
    private readonly portalBaseUrl = inject(PORTAL_BASE_URL);
    private started = false;

    start(): void {
        if (this.started) {
            return;
        }

        this.started = true;
        const { app, splashScreen, systemBars } = this.plugins;

        systemBars.setStyle({ style: SystemBarsStyle.Light }).catch(ignore);
        // Soğuk açılışta gelen bağlantı da bu dinleyiciye iletilir (Capacitor olayı dinleyici eklenene dek saklar).
        app.addListener('appUrlOpen', ({ url }) => this.openDeepLink(url)).catch(ignore);
        app.addListener('backButton', ({ canGoBack }) => this.handleBackButton(canGoBack)).catch(ignore);
        this.router.events.pipe(filter(isNavigationSettled), take(1)).subscribe(() => splashScreen.hide().catch(ignore));
    }

    openDeepLink(url: string): void {
        const path = portalDeepLinkPath(url, this.portalBaseUrl);

        if (path !== null) {
            void this.router.navigateByUrl(path);
        }
    }

    handleBackButton(canGoBack: boolean): void {
        if (portalBackButtonAction(this.router.url, canGoBack) === 'back') {
            this.location.back();
        } else {
            this.plugins.app.exitApp().catch(ignore);
        }
    }
}

/** Yalnız yerel platformda `PortalNativeShell`'i başlatır; tarayıcı derlemesinde etkisizdir. */
export function providePortalNativeShell(): EnvironmentProviders {
    return provideAppInitializer(() => {
        if (isPortalNativePlatform()) {
            inject(PortalNativeShell).start();
        }
    });
}
