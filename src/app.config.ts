import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { TitleStrategy, provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import { PageTitleStrategy } from '@/app/core/routing/page-title.strategy';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { PRIMENG_TR } from '@/app/core/i18n/primeng-tr';
import { authInterceptor } from '@/app/core/api/auth.interceptor';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { environment } from '@/environments/environment';
import { PRIMEUI_LICENSE } from '@/environments/primeui-license.local';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(appRoutes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }), withEnabledBlockingInitialNavigation()),
        { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
        { provide: TitleStrategy, useExisting: PageTitleStrategy },
        provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
        provideZonelessChangeDetection(),
        providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: '.app-dark' } }, translation: PRIMENG_TR, license: PRIMEUI_LICENSE || undefined })
    ]
};
