import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { VISITS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TodayPageComponent } from '@/app/features/visits/pages/today-page/today-page.component';

export default [
    {
        path: '',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return auth.hasOperationClaim(VISITS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: TodayPageComponent
    }
] as Routes;
