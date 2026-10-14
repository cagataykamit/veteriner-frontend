import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { CHARGES_CREATE_CLAIM, CHARGES_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ChargeNewPageComponent } from '@/app/features/charges/pages/charge-new-page/charge-new-page.component';
import { ChargeSuggestionsPageComponent } from '@/app/features/charges/pages/charge-suggestions-page/charge-suggestions-page.component';
import { ChargesListPageComponent } from '@/app/features/charges/pages/charges-list-page/charges-list-page.component';

function requireClaim(claim: string): CanActivateFn {
    return () => {
        const router = inject(Router);
        return inject(AuthService).hasOperationClaim(claim) ? true : router.createUrlTree(['/notfound']);
    };
}

export default [
    { path: '', canActivate: [requireClaim(CHARGES_READ_CLAIM)], component: ChargesListPageComponent },
    { path: 'pending', canActivate: [requireClaim(CHARGES_READ_CLAIM)], component: ChargeSuggestionsPageComponent },
    { path: 'new', canActivate: [requireClaim(CHARGES_CREATE_CLAIM)], component: ChargeNewPageComponent }
] as Routes;
