import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import {
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
