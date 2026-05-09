import { inject } from '@angular/core';
import { Routes, Router } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    APPOINTMENTS_READ_CLAIM,
    EXAMINATIONS_READ_CLAIM,
    PAYMENTS_READ_CLAIM,
    VACCINATIONS_READ_CLAIM
} from '@/app/core/auth/operation-claims.constants';

export default [
    { path: '', pathMatch: 'full', redirectTo: 'payments' },
    {
        path: 'payments',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(PAYMENTS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        loadComponent: () =>
            import('@/app/features/reports/payments/pages/payments-report-page/payments-report-page.component').then(
                (m) => m.PaymentsReportPageComponent
            )
    },
    {
        path: 'appointments',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(APPOINTMENTS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        loadComponent: () =>
            import('@/app/features/reports/appointments/pages/appointments-report-page/appointments-report-page.component').then(
                (m) => m.AppointmentsReportPageComponent
            )
    },
    {
        path: 'examinations',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(EXAMINATIONS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        loadComponent: () =>
            import('@/app/features/reports/examinations/pages/examinations-report-page/examinations-report-page.component').then(
                (m) => m.ExaminationsReportPageComponent
            )
    },
    {
        path: 'vaccinations',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);
            return auth.hasOperationClaim(VACCINATIONS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        loadComponent: () =>
            import('@/app/features/reports/vaccinations/pages/vaccinations-report-page/vaccinations-report-page.component').then(
                (m) => m.VaccinationsReportPageComponent
            )
    }
] as Routes;
