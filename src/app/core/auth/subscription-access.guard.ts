import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { SUBSCRIPTIONS_MANAGE_CLAIM, SUBSCRIPTIONS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';

/** Abonelik özet sayfası — en az okuma veya yönetim claim’i gerekir. */
export const subscriptionAccessGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const ok =
        auth.hasOperationClaim(SUBSCRIPTIONS_READ_CLAIM) || auth.hasOperationClaim(SUBSCRIPTIONS_MANAGE_CLAIM);
    return ok ? true : router.createUrlTree(['/panel/dashboard']);
};
