import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICAL_TERMS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ClinicalTermsPageComponent } from '@/app/features/clinical-terms/pages/clinical-terms-page.component';
import { PANEL_FORBIDDEN_URL } from '@/app/core/auth/panel-forbidden';

export default [
    {
        path: '',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return auth.hasOperationClaim(CLINICAL_TERMS_READ_CLAIM) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
            }
        ],
        component: ClinicalTermsPageComponent
    }
] as Routes;
