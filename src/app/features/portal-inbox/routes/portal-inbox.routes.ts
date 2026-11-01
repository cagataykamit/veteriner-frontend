import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { OWNER_PORTAL_MANAGE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { PortalInboxPageComponent } from '@/app/features/portal-inbox/pages/portal-inbox-page.component';

/** Portal gelen kutusu (`PORTAL_API_CONTRACT.md` §11.2): `OwnerPortal.Manage`. */
export default [
    {
        path: '',
        title: 'Portal gelen kutusu',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return auth.hasOperationClaim(OWNER_PORTAL_MANAGE_CLAIM) ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: PortalInboxPageComponent
    }
] as Routes;
