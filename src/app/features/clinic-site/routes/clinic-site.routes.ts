import { inject } from '@angular/core';
import { Router, type Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_READ_CLAIM, CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';

export default [
    {
        path: '',
        title: 'Web sayfam',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return [CLINICS_READ_CLAIM, CLINICS_UPDATE_CLAIM].some((claim) => auth.hasOperationClaim(claim)) ? true : router.createUrlTree(['/notfound']);
            }
        ],
        loadComponent: () => import('@/app/features/clinic-site/builder/site-builder-page.component').then((m) => m.SiteBuilderPageComponent)
    }
] as Routes;
