import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { TENANT_MANAGEMENT_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { PANEL_FORBIDDEN_URL } from '@/app/core/auth/panel-forbidden';

/** Üye listesi/detayı, rol matrisi ve davet ekranları — `Tenants.InviteCreate` gerekir. */
export const tenantManagementGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    return auth.hasOperationClaim(TENANT_MANAGEMENT_CLAIM) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
};
