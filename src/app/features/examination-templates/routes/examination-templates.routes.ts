import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { EXAMINATION_TEMPLATES_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ExaminationTemplatesPageComponent } from '@/app/features/examination-templates/pages/examination-templates-page.component';

export default [
    {
        path: '',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return auth.hasOperationClaim(EXAMINATION_TEMPLATES_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: ExaminationTemplatesPageComponent
    }
] as Routes;
