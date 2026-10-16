import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PortalSessionService } from './portal-session.service';

/** Uygulama içi dönüş adresi; dış adrese ve `//` ile başlayan yola izin verilmez. */
export function safeReturnUrl(value: unknown): string | null {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
        return null;
    }

    return value;
}

/** Oturum yoksa girişe; sunucuya ulaşılamıyorsa çevrimdışı sayfasına. */
export const portalAuthGuard: CanActivateFn = async (_route, state) => {
    const session = inject(PortalSessionService);
    const router = inject(Router);
    const status = await session.ensureSession();

    if (status === 'authenticated') {
        return true;
    }

    if (status === 'offline') {
        return router.createUrlTree(['/offline']);
    }

    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Giriş/parola sayfaları: oturum açıksa ana sayfaya. */
export const portalGuestGuard: CanActivateFn = async () => {
    const session = inject(PortalSessionService);
    const router = inject(Router);
    const status = await session.ensureSession();

    return status === 'authenticated' ? router.createUrlTree(['/']) : true;
};

/** Birden çok klinik bağı varsa ve seçim yapılmamışsa klinik seçimine (AK-3). */
export const portalClinicGuard: CanActivateFn = async () => {
    const session = inject(PortalSessionService);
    const router = inject(Router);

    // Bağ listesi `/me` ile gelir; oturum yoksa yönlendirmeyi kimlik guard'ı yapar.
    if ((await session.ensureSession()) !== 'authenticated') {
        return false;
    }

    return session.needsClinicSelection() ? router.createUrlTree(['/clinics']) : true;
};
