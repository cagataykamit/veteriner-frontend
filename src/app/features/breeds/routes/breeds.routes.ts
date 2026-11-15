import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { BREEDS_CREATE_CLAIM, BREEDS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { BreedFormPageComponent } from '@/app/features/breeds/pages/breed-form-page/breed-form-page.component';
import { BreedsListPageComponent } from '@/app/features/breeds/pages/breeds-list-page/breeds-list-page.component';
import { PANEL_FORBIDDEN_URL } from '@/app/core/auth/panel-forbidden';

export default [
    {
        path: '',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);
                const ok =
                    auth.hasOperationClaim(BREEDS_CREATE_CLAIM) || auth.hasOperationClaim(BREEDS_UPDATE_CLAIM);

                return ok ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
            }
        ],
        component: BreedsListPageComponent
    },
    {
        path: 'new',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return auth.hasOperationClaim(BREEDS_CREATE_CLAIM) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
            }
        ],
        component: BreedFormPageComponent
    },
    {
        path: ':id/edit',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return auth.hasOperationClaim(BREEDS_UPDATE_CLAIM) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
            }
        ],
        component: BreedFormPageComponent
    }
] as Routes;
