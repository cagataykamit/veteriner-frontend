import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { KvkkFormTemplatePageComponent } from '@/app/features/kvkk/pages/kvkk-form-template-page.component';
import { PANEL_FORBIDDEN_URL } from '@/app/core/auth/panel-forbidden';

export default [
    {
        path: '',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return auth.hasOperationClaim(CLINICS_UPDATE_CLAIM) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
            }
        ],
        component: KvkkFormTemplatePageComponent
    }
] as Routes;
