import { Routes } from '@angular/router';
import { AppointmentDetailPageComponent } from '@/app/features/appointments/pages/appointment-detail-page/appointment-detail-page.component';
import { AppointmentEditPageComponent } from '@/app/features/appointments/pages/appointment-edit-page/appointment-edit-page.component';
import { AppointmentsCalendarPageComponent } from '@/app/features/appointments/pages/appointments-calendar-page/appointments-calendar-page.component';
import { AppointmentNewPageComponent } from '@/app/features/appointments/pages/appointment-new-page/appointment-new-page.component';
import { AppointmentsListPageComponent } from '@/app/features/appointments/pages/appointments-list-page/appointments-list-page.component';

export default [
    { path: '', component: AppointmentsListPageComponent },
    { path: 'calendar', component: AppointmentsCalendarPageComponent },
    { path: 'new', component: AppointmentNewPageComponent },
    { path: ':id/edit', component: AppointmentEditPageComponent },
    { path: ':id', component: AppointmentDetailPageComponent }
] as Routes;
