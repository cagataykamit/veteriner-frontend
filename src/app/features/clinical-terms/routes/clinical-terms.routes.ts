import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICAL_TERMS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ClinicalTermsPageComponent } from '@/app/features/clinical-terms/pages/clinical-terms-page.component';

export default [
    {
        path: '',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return auth.hasOperationClaim(CLINICAL_TERMS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: ClinicalTermsPageComponent
    }
] as Routes;
