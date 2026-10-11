import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { ApplicationConfig, inject, provideAppInitializer, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { openDatePickerOnInputClick } from '@/app/core/ui/date-input-picker';
import { PRIMENG_TR } from '@/app/core/i18n/primeng-tr';
import { authInterceptor } from '@/app/core/api/auth.interceptor';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { environment } from '@/environments/environment';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(appRoutes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }), withEnabledBlockingInitialNavigation()),
        { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
        provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
        provideZonelessChangeDetection(),
        provideAppInitializer(() => {
            openDatePickerOnInputClick(inject(DOCUMENT));
        }),
        providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: '.app-dark' } }, translation: PRIMENG_TR })
    ]
};
