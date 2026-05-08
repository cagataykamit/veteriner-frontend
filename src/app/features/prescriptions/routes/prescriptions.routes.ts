import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    PRESCRIPTIONS_CREATE_CLAIM,
    PRESCRIPTIONS_READ_CLAIM,
    PRESCRIPTIONS_UPDATE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { PrescriptionDetailPageComponent } from '@/app/features/prescriptions/pages/prescription-detail-page/prescription-detail-page.component';
import { PrescriptionEditPageComponent } from '@/app/features/prescriptions/pages/prescription-edit-page/prescription-edit-page.component';
import { PrescriptionNewPageComponent } from '@/app/features/prescriptions/pages/prescription-new-page/prescription-new-page.component';
import { PrescriptionsListPageComponent } from '@/app/features/prescriptions/pages/prescriptions-list-page/prescriptions-list-page.component';

export default [
    {
        path: '',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(PRESCRIPTIONS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: PrescriptionsListPageComponent
    },
    {
        path: 'new',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(PRESCRIPTIONS_CREATE_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: PrescriptionNewPageComponent
    },
    {
        path: ':id/edit',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(PRESCRIPTIONS_UPDATE_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: PrescriptionEditPageComponent
    },
    {
        path: ':id',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(PRESCRIPTIONS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: PrescriptionDetailPageComponent
    }
] as Routes;
