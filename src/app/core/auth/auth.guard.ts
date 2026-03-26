import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state): boolean | UrlTree => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (auth.isAuthenticated()) {
        if (!auth.hasSelectedClinic()) {
            return router.createUrlTree(['/auth/select-clinic'], { queryParams: { returnUrl: state.url } });
        }
        return true;
    }
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};
