import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';

/** Yeni klinik sayfası — `Clinics.Create` yoksa liste rotasına yönlendirilir. */
export const clinicCreateGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    return auth.hasOperationClaim(CLINICS_CREATE_CLAIM) ? true : router.createUrlTree(['/panel/settings/clinics']);
};
