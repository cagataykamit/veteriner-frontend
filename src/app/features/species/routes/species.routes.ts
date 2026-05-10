import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { SPECIES_CREATE_CLAIM, SPECIES_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { SpeciesFormPageComponent } from '@/app/features/species/pages/species-form-page/species-form-page.component';
import { SpeciesListPageComponent } from '@/app/features/species/pages/species-list-page/species-list-page.component';

export default [
    {
        path: '',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);
                const ok =
                    auth.hasOperationClaim(SPECIES_CREATE_CLAIM) || auth.hasOperationClaim(SPECIES_UPDATE_CLAIM);
                return ok ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: SpeciesListPageComponent
    },
    {
        path: 'new',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);
                return auth.hasOperationClaim(SPECIES_CREATE_CLAIM) ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: SpeciesFormPageComponent
    },
    {
        path: ':id/edit',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);
                return auth.hasOperationClaim(SPECIES_UPDATE_CLAIM) ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: SpeciesFormPageComponent
    }
] as Routes;
