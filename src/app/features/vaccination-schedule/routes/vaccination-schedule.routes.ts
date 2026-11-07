import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { DEFINITION_ENTRIES, VACCINATION_SCHEDULE_ROUTE } from '@/app/core/routing/panel-navigation';
import { VaccinationSchedulePageComponent } from '@/app/features/vaccination-schedule/pages/vaccination-schedule-page.component';

/** İzinler gezinti kaydındaki kartla tek yerde. */
const CLAIMS = DEFINITION_ENTRIES.find((e) => e.route === VACCINATION_SCHEDULE_ROUTE)?.claims ?? [];

export default [
    {
        path: '',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return CLAIMS.some((c) => auth.hasOperationClaim(c)) ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: VaccinationSchedulePageComponent
    }
] as Routes;
