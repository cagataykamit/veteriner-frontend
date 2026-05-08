import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    HOSPITALIZATIONS_CREATE_CLAIM,
    HOSPITALIZATIONS_READ_CLAIM,
    HOSPITALIZATIONS_UPDATE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { HospitalizationDetailPageComponent } from '@/app/features/hospitalizations/pages/hospitalization-detail-page/hospitalization-detail-page.component';
import { HospitalizationEditPageComponent } from '@/app/features/hospitalizations/pages/hospitalization-edit-page/hospitalization-edit-page.component';
import { HospitalizationNewPageComponent } from '@/app/features/hospitalizations/pages/hospitalization-new-page/hospitalization-new-page.component';
import { HospitalizationsListPageComponent } from '@/app/features/hospitalizations/pages/hospitalizations-list-page/hospitalizations-list-page.component';

export default [
    {
        path: '',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(HOSPITALIZATIONS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: HospitalizationsListPageComponent
    },
    {
        path: 'new',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(HOSPITALIZATIONS_CREATE_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: HospitalizationNewPageComponent
    },
    {
        path: ':id/edit',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(HOSPITALIZATIONS_UPDATE_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: HospitalizationEditPageComponent
    },
    {
        path: ':id',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(HOSPITALIZATIONS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: HospitalizationDetailPageComponent
    }
] as Routes;
