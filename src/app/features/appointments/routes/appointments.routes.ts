import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    APPOINTMENT_REQUESTS_MANAGE_CLAIM,
    APPOINTMENTS_CREATE_CLAIM,
    APPOINTMENTS_READ_CLAIM,
    APPOINTMENTS_RESCHEDULE_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { AppointmentDetailPageComponent } from '@/app/features/appointments/pages/appointment-detail-page/appointment-detail-page.component';
import { AppointmentEditPageComponent } from '@/app/features/appointments/pages/appointment-edit-page/appointment-edit-page.component';
import { AppointmentsCalendarPageComponent } from '@/app/features/appointments/pages/appointments-calendar-page/appointments-calendar-page.component';
import { AppointmentNewPageComponent } from '@/app/features/appointments/pages/appointment-new-page/appointment-new-page.component';
import { AppointmentsListPageComponent } from '@/app/features/appointments/pages/appointments-list-page/appointments-list-page.component';

export default [
    {
        path: '',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);

            return auth.hasOperationClaim(APPOINTMENTS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: AppointmentsListPageComponent
    },
    {
        path: 'calendar',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);

            return auth.hasOperationClaim(APPOINTMENTS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: AppointmentsCalendarPageComponent
    },
    {
        path: 'requests',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);

            return auth.hasOperationClaim(APPOINTMENT_REQUESTS_MANAGE_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        loadComponent: () => import('@/app/features/appointment-requests/pages/appointment-requests-page.component').then((m) => m.AppointmentRequestsPageComponent)
    },
    {
        // Bekleme listesi (TIER-018): okuma randevu okuma iznidir; paket kilidi sayfada "üst pakete geç" kutusuyla gösterilir.
        path: 'waitlist',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);

            return auth.hasOperationClaim(APPOINTMENTS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        loadComponent: () => import('@/app/features/waitlist/pages/waitlist-page.component').then((m) => m.WaitlistPageComponent)
    },
    {
        path: 'new',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);

            return auth.hasOperationClaim(APPOINTMENTS_CREATE_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: AppointmentNewPageComponent
    },
    {
        path: ':id/edit',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);

            return auth.hasOperationClaim(APPOINTMENTS_RESCHEDULE_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: AppointmentEditPageComponent
    },
    {
        path: ':id',
        canActivate: [() => {
            const auth = inject(AuthService);
            const router = inject(Router);

            return auth.hasOperationClaim(APPOINTMENTS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
        }],
        component: AppointmentDetailPageComponent
    }
] as Routes;
