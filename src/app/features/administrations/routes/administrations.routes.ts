import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { ADMINISTRATIONS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { AdministrationsListPageComponent } from '@/app/features/administrations/pages/administrations-list-page/administrations-list-page.component';
import { PANEL_FORBIDDEN_URL } from '@/app/core/auth/panel-forbidden';

function requireClaim(claim: string): CanActivateFn {
    return () => {
        const router = inject(Router);

        return inject(AuthService).hasOperationClaim(claim) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
    };
}

export default [
    { path: '', canActivate: [requireClaim(ADMINISTRATIONS_READ_CLAIM)], component: AdministrationsListPageComponent }
] as Routes;
