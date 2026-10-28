import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    ADMINISTRATIONS_READ_CLAIM,
    APPOINTMENTS_READ_CLAIM,
    CHARGES_READ_CLAIM,
    EXAMINATIONS_READ_CLAIM,
    PAYMENTS_READ_CLAIM,
    PRESCRIPTIONS_READ_CLAIM,
    PRODUCTS_READ_CLAIM,
    STOCK_MOVEMENTS_READ_CLAIM,
    VACCINATIONS_READ_CLAIM,
    VISITS_READ_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { MANAGER_LEVEL_CLAIM, REPORT_SECTIONS } from '@/app/core/routing/panel-navigation';

/** İzinlerden herhangi biri varsa geçer; yoksa `/notfound`. */
function requireAnyClaim(claims: readonly string[]): CanActivateFn {
    return () => {
        const auth = inject(AuthService);
        const router = inject(Router);

        return claims.some((c) => auth.hasOperationClaim(c)) ? true : router.createUrlTree(['/notfound']);
    };
}

/** İzinlerin hepsi birlikte gerekir (hayvan/sahip verisi taşıyan defterler); yoksa `/notfound`. */
function requireAllClaims(claims: readonly string[]): CanActivateFn {
    return () => {
        const auth = inject(AuthService);
        const router = inject(Router);

        return claims.every((c) => auth.hasOperationClaim(c)) ? true : router.createUrlTree(['/notfound']);
    };
}

const registerPage = () => import('@/app/features/reports/registers/pages/register-page/register-page.component').then((m) => m.RegisterPageComponent);

export default [
    {
        path: '',
        pathMatch: 'full',
        canActivate: [requireAnyClaim(REPORT_SECTIONS.flatMap((s) => s.entries.flatMap((e) => e.claims ?? [])))],
        loadComponent: () =>
            import('@/app/features/reports/pages/reports-hub-page/reports-hub-page.component').then((m) => m.ReportsHubPageComponent)
    },
    {
        path: 'performance',
        canActivate: [requireAnyClaim([MANAGER_LEVEL_CLAIM])],
        loadComponent: () =>
            import('@/app/features/reports/performance/pages/performance-page/performance-page.component').then((m) => m.PerformancePageComponent)
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
        path: 'end-of-day',
        canActivate: [requireAnyClaim([PAYMENTS_READ_CLAIM, VISITS_READ_CLAIM])],
        loadComponent: () =>
            import('@/app/features/reports/end-of-day/pages/end-of-day-page/end-of-day-page.component').then((m) => m.EndOfDayPageComponent)
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
    },
    {
        path: 'registers/examinations',
        canActivate: [requireAnyClaim([EXAMINATIONS_READ_CLAIM])],
        data: { register: 'examinations' },
        loadComponent: () => import('@/app/features/reports/registers/pages/register-page/register-page.component').then((m) => m.RegisterPageComponent)
    },
    {
        path: 'registers/prescriptions',
        canActivate: [requireAnyClaim([PRESCRIPTIONS_READ_CLAIM])],
        data: { register: 'prescriptions' },
        loadComponent: () => import('@/app/features/reports/registers/pages/register-page/register-page.component').then((m) => m.RegisterPageComponent)
    },
    {
        path: 'registers/vaccines',
        canActivate: [requireAllClaims([STOCK_MOVEMENTS_READ_CLAIM])],
        data: { register: 'vaccines' },
        loadComponent: registerPage
    },
    {
        path: 'registers/medications',
        canActivate: [requireAllClaims([STOCK_MOVEMENTS_READ_CLAIM])],
        data: { register: 'medications' },
        loadComponent: registerPage
    },
    {
        path: 'registers/controlled-substances',
        canActivate: [requireAllClaims([STOCK_MOVEMENTS_READ_CLAIM, ADMINISTRATIONS_READ_CLAIM])],
        data: { register: 'controlled-substances' },
        loadComponent: registerPage
    },
    {
        path: 'registers/vaccine-info',
        canActivate: [requireAllClaims([ADMINISTRATIONS_READ_CLAIM, VACCINATIONS_READ_CLAIM, PRODUCTS_READ_CLAIM])],
        data: { register: 'vaccine-info' },
        loadComponent: registerPage
    },
    {
        path: 'registers/hbs-prescriptions',
        canActivate: [requireAnyClaim([PRESCRIPTIONS_READ_CLAIM])],
        data: { register: 'hbs-prescriptions' },
        loadComponent: registerPage
    },
    {
        path: 'registers/hbs-vaccinations',
        canActivate: [requireAnyClaim([VACCINATIONS_READ_CLAIM])],
        data: { register: 'hbs-vaccinations' },
        loadComponent: registerPage
    },
    {
        path: 'outstanding-balances',
        canActivate: [requireAnyClaim([CHARGES_READ_CLAIM])],
        loadComponent: () =>
            import('@/app/features/reports/outstanding-balances/pages/outstanding-balances-report-page/outstanding-balances-report-page.component').then(
                (m) => m.OutstandingBalancesReportPageComponent
            )
    }
] as Routes;
