import { Routes } from '@angular/router';

export default [
    { path: '', pathMatch: 'full', redirectTo: 'payments' },
    {
        path: 'payments',
        loadComponent: () =>
            import('@/app/features/reports/payments/pages/payments-report-page/payments-report-page.component').then(
                (m) => m.PaymentsReportPageComponent
            )
    }
] as Routes;
