import { type ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter, type Routes, type UrlMatchResult, type UrlSegment, withDisabledInitialNavigation } from '@angular/router';
import { SitePageHostComponent } from './site-page-host.component';

/** Uygulama `/k/` altında yaşar (`baseHref`): ilk parça adres, kalan her şey sitenin içindeki yol. Tek rota, bileşen yeniden kurulmaz. */
export function siteUrlMatcher(segments: UrlSegment[]): UrlMatchResult | null {
    return segments.length ? { consumed: segments, posParams: { slug: segments[0] } } : null;
}

export const SITE_ROUTES: Routes = [{ matcher: siteUrlMatcher, component: SitePageHostComponent }, { path: '**', component: SitePageHostComponent }];

/**
 * Veteriner bul sayfaları (`/veteriner/...`) yönlendiriciyle çizilmez, kök bileşen seçer: adres `/k/` tabanının dışındadır ve yönlendirici
 * ilk gezintide adresi tabana göre yeniden yazardı. Tarayıcıda bu sayfalarda ilk gezinti kapalıdır (`main.ts`); sunucuda fark etmez.
 */
export function buildSiteAppConfig(options: { readonly initialNavigation: boolean } = { initialNavigation: true }): ApplicationConfig {
    return {
        providers: [
            provideBrowserGlobalErrorListeners(),
            provideZonelessChangeDetection(),
            provideRouter(SITE_ROUTES, ...(options.initialNavigation ? [] : [withDisabledInitialNavigation()])),
            provideClientHydration()
        ]
    };
}

export const siteAppConfig: ApplicationConfig = buildSiteAppConfig();
