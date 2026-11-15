import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { CUSTOM_DEVELOPMENT_REQUESTS_MANAGE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { CustomDevelopmentPageComponent } from '@/app/features/custom-development/pages/custom-development-page.component';
import { PANEL_FORBIDDEN_URL } from '@/app/core/auth/panel-forbidden';

/** Ayarlar > Size özel geliştirmeler (`CUSTOM_DEVELOPMENT_REQUESTS_API_CONTRACT.md` §3): yalnız `CustomDevelopmentRequests.Manage` (Admin, Owner). */
export default [
    {
        path: '',
        title: 'Size özel geliştirmeler',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return auth.hasOperationClaim(CUSTOM_DEVELOPMENT_REQUESTS_MANAGE_CLAIM) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
            }
        ],
        component: CustomDevelopmentPageComponent
    }
] as Routes;
