import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    APPOINTMENTS_READ_CLAIM,
    EXAMINATIONS_READ_CLAIM,
    PAYMENTS_READ_CLAIM,
    VACCINATIONS_READ_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { REPORT_SECTIONS } from '@/app/core/routing/panel-navigation';

/** İzinlerden herhangi biri varsa geçer; yoksa `/notfound`. */
function requireAnyClaim(claims: readonly string[]): CanActivateFn {
    return () => {
        const auth = inject(AuthService);
        const router = inject(Router);
        return claims.some((c) => auth.hasOperationClaim(c)) ? true : router.createUrlTree(['/notfound']);
    };
}

export default [
    {
        path: '',
        pathMatch: 'full',
        canActivate: [requireAnyClaim(REPORT_SECTIONS.flatMap((s) => s.entries.flatMap((e) => e.claims ?? [])))],
        loadComponent: () =>
            import('@/app/features/reports/pages/reports-hub-page/reports-hub-page.component').then((m) => m.ReportsHubPageComponent)
    },
    {
        path: 'payments',
        canActivate: [requireAnyClaim([PAYMENTS_READ_CLAIM])],
        loadComponent: () =>
            import('@/app/features/reports/payments/pages/payments-report-page/payments-report-page.component').then(
                (m) => m.PaymentsReportPageComponent
            )
    },
    {
        path: 'appointments',
        canActivate: [requireAnyClaim([APPOINTMENTS_READ_CLAIM])],
        loadComponent: () =>
            import('@/app/features/reports/appointments/pages/appointments-report-page/appointments-report-page.component').then(
                (m) => m.AppointmentsReportPageComponent
            )
    },
    {
        path: 'examinations',
        canActivate: [requireAnyClaim([EXAMINATIONS_READ_CLAIM])],
        loadComponent: () =>
            import('@/app/features/reports/examinations/pages/examinations-report-page/examinations-report-page.component').then(
                (m) => m.ExaminationsReportPageComponent
            )
    },
    {
        path: 'vaccinations',
        canActivate: [requireAnyClaim([VACCINATIONS_READ_CLAIM])],
        loadComponent: () =>
            import('@/app/features/reports/vaccinations/pages/vaccinations-report-page/vaccinations-report-page.component').then(
                (m) => m.VaccinationsReportPageComponent
            )
    }
] as Routes;
