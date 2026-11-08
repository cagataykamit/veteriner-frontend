import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { API_KEYS_MANAGE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ApiAccessPageComponent } from '@/app/features/api-access/pages/api-access-page.component';

/** Ayarlar > API erişimi (`EXTERNAL_API_CONTRACT.md` §6): yalnız `ApiKeys.Manage` (Admin, Owner). */
export default [
    {
        path: '',
        title: 'API erişimi',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return auth.hasOperationClaim(API_KEYS_MANAGE_CLAIM) ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: ApiAccessPageComponent
    }
] as Routes;
