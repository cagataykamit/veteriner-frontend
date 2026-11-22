import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { DRUG_GUIDE_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { PANEL_FORBIDDEN_URL } from '@/app/core/auth/panel-forbidden';
import { DrugGuidePageComponent } from '@/app/features/drug-guide/pages/drug-guide-page.component';

export default [
    {
        path: '',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return auth.hasOperationClaim(DRUG_GUIDE_READ_CLAIM) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
            }
        ],
        component: DrugGuidePageComponent
    }
] as Routes;
