import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLIENTS_READ_CLAIM, PETS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { PatientsHomePageComponent } from '@/app/features/patients/pages/patients-home-page/patients-home-page.component';

export default [
    {
        path: '',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return auth.hasOperationClaim(CLIENTS_READ_CLAIM) || auth.hasOperationClaim(PETS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: PatientsHomePageComponent
    }
] as Routes;
