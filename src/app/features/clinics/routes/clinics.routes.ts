import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    CLINICS_CREATE_CLAIM,
    CLINICS_READ_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { ClinicCreatePageComponent } from '@/app/features/clinics/pages/clinic-create-page/clinic-create-page.component';
import { ClinicDetailPageComponent } from '@/app/features/clinics/pages/clinic-detail-page/clinic-detail-page.component';
import { ClinicsListPageComponent } from '@/app/features/clinics/pages/clinics-list-page/clinics-list-page.component';

export default [
    {
        path: '',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(CLINICS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: ClinicsListPageComponent
    },
    {
        path: 'new',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(CLINICS_CREATE_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: ClinicCreatePageComponent
    },
    {
        path: ':clinicId',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(CLINICS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: ClinicDetailPageComponent
    }
] as Routes;
