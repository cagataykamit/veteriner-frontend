import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, isDevMode, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { PortalPreset } from './core/theme/portal-preset';
import { providePrimeNG } from 'primeng/config';
import { environment } from '@portal/environments/environment';
import { PRIMEUI_LICENSE } from '@portal/environments/primeui-license.local';
import { PORTAL_API_BASE_URL } from './core/api/portal-api.client';
import { portalAuthInterceptor } from './core/api/portal-auth.interceptor';
import { isPortalNativePlatform, portalServiceWorkerEnabled } from './core/native/portal-native';
import { providePortalNativeShell } from './core/native/portal-native-shell';
import { CapacitorPortalPushDevice } from './core/push/capacitor-portal-push-device';
import { PortalPushDevice } from './core/push/portal-push-device';
import { portalRoutes } from './app.routes';

export const portalAppConfig: ApplicationConfig = {
    providers: [
        provideZonelessChangeDetection(),
        provideRouter(portalRoutes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
        { provide: PORTAL_API_BASE_URL, useValue: environment.portalApiBaseUrl },
        provideHttpClient(withFetch(), withInterceptors([portalAuthInterceptor])),
        // Panelle aynı birincil renk (Aura + logo turkuazı, PO-01). Koyu tema `portal-dark` sınıfıyla (`core/theme/portal-theme.ts`): cihaz teması ya da Hesabım > Görünüm.
        providePrimeNG({ theme: { preset: PortalPreset, options: { darkModeSelector: '.portal-dark' } }, license: PRIMEUI_LICENSE || undefined }),
        // Yalnız statik varlıklar önbelleğe alınır (`ngsw-config.json`); API yanıtları önbelleklenmez. Mobil pakette kayıtlanmaz.
        provideServiceWorker('ngsw-worker.js', {
            enabled: portalServiceWorkerEnabled(isDevMode(), isPortalNativePlatform()),
            registrationStrategy: 'registerWhenStable:30000'
        }),
        providePortalNativeShell(),
        // Mağaza paketinde push jetonu Capacitor eklentisinden gelir; tarayıcıda varsayılan (jeton üretmez) kalır.
        ...(isPortalNativePlatform() ? [{ provide: PortalPushDevice, useFactory: () => new CapacitorPortalPushDevice() }] : [])
    ]
};
