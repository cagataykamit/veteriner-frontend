import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    VACCINATIONS_CREATE_CLAIM,
    VACCINATIONS_READ_CLAIM,
    VACCINATIONS_UPDATE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { VaccinationDetailPageComponent } from '@/app/features/vaccinations/pages/vaccination-detail-page/vaccination-detail-page.component';
import { VaccinationEditPageComponent } from '@/app/features/vaccinations/pages/vaccination-edit-page/vaccination-edit-page.component';
import { VaccinationNewPageComponent } from '@/app/features/vaccinations/pages/vaccination-new-page/vaccination-new-page.component';
import { VaccinationsListPageComponent } from '@/app/features/vaccinations/pages/vaccinations-list-page/vaccinations-list-page.component';

export default [
    {
        path: '',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(VACCINATIONS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: VaccinationsListPageComponent
    },
    {
        path: 'new',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(VACCINATIONS_CREATE_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: VaccinationNewPageComponent
    },
    {
        path: ':id/edit',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(VACCINATIONS_UPDATE_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: VaccinationEditPageComponent
    },
    {
        path: ':id',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(VACCINATIONS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: VaccinationDetailPageComponent
    }
] as Routes;
