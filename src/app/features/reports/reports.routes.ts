import { inject } from '@angular/core';
import { Routes, Router } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';

export default [
    { path: '', pathMatch: 'full', redirectTo: 'payments' },
    {
        path: 'payments',
        loadComponent: () =>
            import('@/app/features/reports/payments/pages/payments-report-page/payments-report-page.component').then(
                (m) => m.PaymentsReportPageComponent
            )
    },
    {
        path: 'appointments',
        loadComponent: () =>
            import('@/app/features/reports/appointments/pages/appointments-report-page/appointments-report-page.component').then(
                (m) => m.AppointmentsReportPageComponent
            )
    },
    {
        path: 'examinations',
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
            return auth.hasOperationClaim('Vaccinations.Read') ? true : router.createUrlTree(['/notfound']);
        }],
        loadComponent: () =>
            import('@/app/features/reports/vaccinations/pages/vaccinations-report-page/vaccinations-report-page.component').then(
                (m) => m.VaccinationsReportPageComponent
            )
    }
] as Routes;
