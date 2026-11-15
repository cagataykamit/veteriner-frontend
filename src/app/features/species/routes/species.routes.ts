import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { SPECIES_CREATE_CLAIM, SPECIES_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { SpeciesFormPageComponent } from '@/app/features/species/pages/species-form-page/species-form-page.component';
import { SpeciesListPageComponent } from '@/app/features/species/pages/species-list-page/species-list-page.component';
import { PANEL_FORBIDDEN_URL } from '@/app/core/auth/panel-forbidden';
import { unsavedChangesGuard } from '@/app/shared/ui/unsaved-changes/unsaved-changes.guard';

export default [
    {
        path: '',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);
                const ok =
                    auth.hasOperationClaim(SPECIES_CREATE_CLAIM) || auth.hasOperationClaim(SPECIES_UPDATE_CLAIM);

                return ok ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
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

                return auth.hasOperationClaim(SPECIES_CREATE_CLAIM) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
            }
        ],
        component: SpeciesFormPageComponent,
        canDeactivate: [unsavedChangesGuard]
    },
    {
        path: ':id/edit',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return auth.hasOperationClaim(SPECIES_UPDATE_CLAIM) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
            }
        ],
        component: SpeciesFormPageComponent,
        canDeactivate: [unsavedChangesGuard]
    }
] as Routes;
