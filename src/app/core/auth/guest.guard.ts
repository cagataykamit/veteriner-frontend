import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

export const guestGuard: CanActivateFn = (): boolean | UrlTree => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (auth.isAuthenticated()) {
        if (!auth.hasSelectedClinic()) {
            return router.createUrlTree(['/auth/select-clinic']);
        }
        return router.createUrlTree(['/panel/dashboard']);
    }
    return true;
};
