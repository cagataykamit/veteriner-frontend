import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { EXAMINATION_TEMPLATES_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ExaminationTemplatesPageComponent } from '@/app/features/examination-templates/pages/examination-templates-page.component';
import { PANEL_FORBIDDEN_URL } from '@/app/core/auth/panel-forbidden';

export default [
    {
        path: '',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return auth.hasOperationClaim(EXAMINATION_TEMPLATES_READ_CLAIM) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
            }
        ],
        component: ExaminationTemplatesPageComponent
    }
] as Routes;
