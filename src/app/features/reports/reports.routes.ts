import { Routes } from '@angular/router';

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
    }
] as Routes;
