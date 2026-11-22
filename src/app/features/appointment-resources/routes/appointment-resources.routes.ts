import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { APPOINTMENT_RESOURCES_ROUTE, DEFINITION_ENTRIES } from '@/app/core/routing/panel-navigation';
import { AppointmentResourcesPageComponent } from '@/app/features/appointment-resources/pages/appointment-resources-page.component';
import { PANEL_FORBIDDEN_URL } from '@/app/core/auth/panel-forbidden';

/** Okuma policy'si backend `Clinics_SchedulingRead` ile aynı (herhangi biri yeter); izinler gezinti kaydındaki kartla tek yerde. */
const READ_CLAIMS = DEFINITION_ENTRIES.find((e) => e.route === APPOINTMENT_RESOURCES_ROUTE)?.claims ?? [];

export default [
    {
        path: '',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return READ_CLAIMS.some((c) => auth.hasOperationClaim(c)) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
            }
        ],
        component: AppointmentResourcesPageComponent
    }
] as Routes;
