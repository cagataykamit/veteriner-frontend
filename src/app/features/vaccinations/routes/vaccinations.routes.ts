import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    VACCINE_DEFINITIONS_READ_CLAIM,
    VACCINATIONS_CREATE_CLAIM,
    VACCINATIONS_READ_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { VaccinationDetailPageComponent } from '@/app/features/vaccinations/pages/vaccination-detail-page/vaccination-detail-page.component';
import { VaccinationEditPageComponent } from '@/app/features/vaccinations/pages/vaccination-edit-page/vaccination-edit-page.component';
import { VaccinationNewPageComponent } from '@/app/features/vaccinations/pages/vaccination-new-page/vaccination-new-page.component';
import { VaccinationsListPageComponent } from '@/app/features/vaccinations/pages/vaccinations-list-page/vaccinations-list-page.component';
import { canOpenVaccinationEdit } from '@/app/entities/vaccination/utils/vaccination-access.utils';
import { PANEL_FORBIDDEN_URL } from '@/app/core/auth/panel-forbidden';
import { unsavedChangesGuard } from '@/app/shared/ui/unsaved-changes/unsaved-changes.guard';

export default [
    {
        path: '',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);

            return auth.hasOperationClaim(VACCINATIONS_READ_CLAIM) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
        }],
        component: VaccinationsListPageComponent
    },
    {
        path: 'new',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);

            return auth.hasOperationClaim(VACCINATIONS_CREATE_CLAIM) && auth.hasOperationClaim(VACCINE_DEFINITIONS_READ_CLAIM)
                ? true
                : router.createUrlTree([PANEL_FORBIDDEN_URL]);
        }],
        component: VaccinationNewPageComponent,
        canDeactivate: [unsavedChangesGuard]
    },
    {
        path: ':id/edit',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);

            return canOpenVaccinationEdit((c) => auth.hasOperationClaim(c)) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
        }],
        component: VaccinationEditPageComponent,
        canDeactivate: [unsavedChangesGuard]
    },
    {
        path: ':id',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);

            return auth.hasOperationClaim(VACCINATIONS_READ_CLAIM) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
        }],
        component: VaccinationDetailPageComponent
    }
] as Routes;
