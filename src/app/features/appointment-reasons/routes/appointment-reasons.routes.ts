import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { APPOINTMENT_REASONS_ROUTE, DEFINITION_ENTRIES } from '@/app/core/routing/panel-navigation';
import { AppointmentReasonsPageComponent } from '@/app/features/appointment-reasons/pages/appointment-reasons-page.component';

/** Okuma policy'si backend `Clinics_SchedulingRead` ile aynı (herhangi biri yeter); izinler gezinti kaydındaki kartla tek yerde. */
const READ_CLAIMS = DEFINITION_ENTRIES.find((e) => e.route === APPOINTMENT_REASONS_ROUTE)?.claims ?? [];

export default [
    {
        path: '',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return READ_CLAIMS.some((c) => auth.hasOperationClaim(c)) ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: AppointmentReasonsPageComponent
    }
] as Routes;
