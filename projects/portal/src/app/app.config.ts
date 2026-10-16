import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, isDevMode, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { environment } from '@portal/environments/environment';
import { PORTAL_API_BASE_URL } from './core/api/portal-api.client';
import { portalAuthInterceptor } from './core/api/portal-auth.interceptor';
import { isPortalNativePlatform, portalServiceWorkerEnabled } from './core/native/portal-native';
import { providePortalNativeShell } from './core/native/portal-native-shell';
import { portalRoutes } from './app.routes';

export const portalAppConfig: ApplicationConfig = {
    providers: [
        provideZonelessChangeDetection(),
        provideRouter(portalRoutes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
        { provide: PORTAL_API_BASE_URL, useValue: environment.portalApiBaseUrl },
        provideHttpClient(withFetch(), withInterceptors([portalAuthInterceptor])),
        // Panelle aynı tema (Aura). Koyu tema Dilim 1'de yok: seçici hiç eklenmez, işletim sistemi teması uygulanmaz.
        providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: '.portal-dark' } } }),
        // Yalnız statik varlıklar önbelleğe alınır (`ngsw-config.json`); API yanıtları önbelleklenmez. Mobil pakette kayıtlanmaz.
        provideServiceWorker('ngsw-worker.js', {
            enabled: portalServiceWorkerEnabled(isDevMode(), isPortalNativePlatform()),
            registrationStrategy: 'registerWhenStable:30000'
        }),
        providePortalNativeShell()
    ]
};
