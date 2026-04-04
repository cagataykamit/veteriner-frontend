import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { DEFAULT_PANEL_AFTER_AUTH, safePanelReturnUrl } from './auth-return-url.utils';
import { AuthService } from './auth.service';

/**
 * Misafir ekranları (login vb.): oturum açıksa panele veya güvenli `returnUrl` hedefine yönlendirir.
 * Önceden giriş yapmış kullanıcı `/auth/login?returnUrl=/panel/...` ile geldiğinde hedef yutuluyordu.
 */
export const guestGuard: CanActivateFn = (route): boolean | UrlTree => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isAuthenticated()) {
        return true;
    }
    const returnUrl = safePanelReturnUrl(route.root.queryParamMap.get('returnUrl'));
    if (!auth.hasSelectedClinic()) {
        return returnUrl
            ? router.createUrlTree(['/auth/select-clinic'], { queryParams: { returnUrl } })
            : router.createUrlTree(['/auth/select-clinic']);
    }
    if (returnUrl) {
        return router.parseUrl(returnUrl);
    }
    return router.parseUrl(DEFAULT_PANEL_AFTER_AUTH);
};
