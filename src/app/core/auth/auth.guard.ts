import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { panelReturnUrlOrDefault } from './auth-return-url.utils';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const loginTree = router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: panelReturnUrlOrDefault(state.url) }
    });
    return auth.ensureValidAccessToken().pipe(
        map(() => {
            if (auth.isAuthenticated()) {
                if (!auth.hasSelectedClinic()) {
                    return router.createUrlTree(['/auth/select-clinic'], {
                        queryParams: { returnUrl: panelReturnUrlOrDefault(state.url) }
                    });
                }
                return true;
            }
            return loginTree;
        }),
        catchError(() => of(loginTree))
    );
};
