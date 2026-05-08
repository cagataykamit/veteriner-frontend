import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    LAB_RESULTS_CREATE_CLAIM,
    LAB_RESULTS_READ_CLAIM,
    LAB_RESULTS_UPDATE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { LabResultDetailPageComponent } from '@/app/features/lab-results/pages/lab-result-detail-page/lab-result-detail-page.component';
import { LabResultEditPageComponent } from '@/app/features/lab-results/pages/lab-result-edit-page/lab-result-edit-page.component';
import { LabResultNewPageComponent } from '@/app/features/lab-results/pages/lab-result-new-page/lab-result-new-page.component';
import { LabResultsListPageComponent } from '@/app/features/lab-results/pages/lab-results-list-page/lab-results-list-page.component';

export default [
    {
        path: '',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(LAB_RESULTS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: LabResultsListPageComponent
    },
    {
        path: 'new',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(LAB_RESULTS_CREATE_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: LabResultNewPageComponent
    },
    {
        path: ':id/edit',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(LAB_RESULTS_UPDATE_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: LabResultEditPageComponent
    },
    {
        path: ':id',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(LAB_RESULTS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: LabResultDetailPageComponent
    }
] as Routes;
