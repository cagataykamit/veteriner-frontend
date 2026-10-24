import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_READ_CLAIM, CLINICS_UPDATE_CLAIM, HOSPITALIZATIONS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { HospitalizationWardsPageComponent } from '@/app/features/hospitalization-wards/pages/hospitalization-wards-page.component';

/** Okuma policy'si backend `Clinics_HospitalizationWardsRead` ile aynı: izinlerden herhangi biri yeter (sözleşme §10.2). */
export const HOSPITALIZATION_WARDS_READ_CLAIMS = [HOSPITALIZATIONS_READ_CLAIM, CLINICS_READ_CLAIM, CLINICS_UPDATE_CLAIM] as const;

export default [
    {
        path: '',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return HOSPITALIZATION_WARDS_READ_CLAIMS.some((c) => auth.hasOperationClaim(c)) ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: HospitalizationWardsPageComponent
    }
] as Routes;
