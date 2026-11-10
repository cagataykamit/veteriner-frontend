import { DOCUMENT } from '@angular/common';
import { inject, InjectionToken } from '@angular/core';
import { CanActivateFn } from '@angular/router';

/** Uygulamanın iki yüzeyi (ADR-033): tanıtım sitesi `www`, klinik paneli (giriş ve davet dahil) `panel` alt alan adında. */
export type AppSurface = 'public' | 'panel';

export interface SurfaceOrigins {
    readonly public: string;
    readonly panel: string;
}

/** Yüzey kökleri; `app.config.ts` → `environment`. Sağlanmazsa (geliştirme, testler) iki yüzey aynı adreste çalışır. */
export const SURFACE_ORIGINS = new InjectionToken<SurfaceOrigins>('SURFACE_ORIGINS', {
    factory: () => ({ public: '', panel: '' })
});

/**
 * Yüzey başka adresteyse gidilecek tam adres; yönlendirme gerekmiyorsa `null`. Kök boşsa iki yüzey aynı adreste çalışır.
 */
export function surfaceRedirectUrl(surface: AppSurface, currentOrigin: string, url: string, origins: SurfaceOrigins): string | null {
    const target = origins[surface].replace(/\/$/, '');

    if (!target || currentOrigin === target) {
        return null;
    }

    return target + url;
}

/**
 * Uygulama içi bağlantılar sunucuya gitmediğinden nginx'in alt alan adı yönlendirmesi devreye girmez; yüzey kendi adresinde
 * değilse tam sayfa yönlendirme yapılır (oturum ve depolama yalnız panel adresinde kalır).
 */
export function surfaceOriginGuard(surface: AppSurface): CanActivateFn {
    return (_route, state) => {
        const location = inject(DOCUMENT).location;
        const redirect = surfaceRedirectUrl(surface, location.origin, state.url, inject(SURFACE_ORIGINS));

        if (redirect === null) {
            return true;
        }

        location.assign(redirect);

        return false;
    };
}
