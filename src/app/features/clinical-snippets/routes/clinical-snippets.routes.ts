import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICAL_SNIPPETS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ClinicalSnippetsPageComponent } from '@/app/features/clinical-snippets/pages/clinical-snippets-page.component';

export default [
    {
        path: '',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return auth.hasOperationClaim(CLINICAL_SNIPPETS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: ClinicalSnippetsPageComponent
    }
] as Routes;
