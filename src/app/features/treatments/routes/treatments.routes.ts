import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    TREATMENTS_CREATE_CLAIM,
    TREATMENTS_READ_CLAIM,
    TREATMENTS_UPDATE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { TreatmentDetailPageComponent } from '@/app/features/treatments/pages/treatment-detail-page/treatment-detail-page.component';
import { TreatmentEditPageComponent } from '@/app/features/treatments/pages/treatment-edit-page/treatment-edit-page.component';
import { TreatmentNewPageComponent } from '@/app/features/treatments/pages/treatment-new-page/treatment-new-page.component';
import { TreatmentsListPageComponent } from '@/app/features/treatments/pages/treatments-list-page/treatments-list-page.component';

export default [
    {
        path: '',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(TREATMENTS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: TreatmentsListPageComponent
    },
    {
        path: 'new',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(TREATMENTS_CREATE_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: TreatmentNewPageComponent
    },
    {
        path: ':id/edit',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(TREATMENTS_UPDATE_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: TreatmentEditPageComponent
    },
    {
        path: ':id',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(TREATMENTS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: TreatmentDetailPageComponent
    }
] as Routes;
