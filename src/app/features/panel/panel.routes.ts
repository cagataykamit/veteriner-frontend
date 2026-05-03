import { Routes } from '@angular/router';
import { subscriptionAccessGuard } from '@/app/core/auth/subscription-access.guard';
import { tenantManagementGuard } from '@/app/core/auth/tenant-management.guard';

export default [
    { path: 'dashboard', loadChildren: () => import('../dashboard/dashboard.routes') },
    { path: 'clients', loadChildren: () => import('../clients/routes/clients.routes') },
    { path: 'pets', loadChildren: () => import('../pets/routes/pets.routes') },
    { path: 'species', loadChildren: () => import('../species/routes/species.routes') },
    { path: 'breeds', loadChildren: () => import('../breeds/routes/breeds.routes') },
    { path: 'appointments', loadChildren: () => import('../appointments/routes/appointments.routes') },
    { path: 'examinations', loadChildren: () => import('../examinations/routes/examinations.routes') },
    { path: 'vaccinations', loadChildren: () => import('../vaccinations/routes/vaccinations.routes') },
    { path: 'payments', loadChildren: () => import('../payments/routes/payments.routes') },
    { path: 'reports', loadChildren: () => import('../reports/reports.routes') },
    {
        path: 'settings/subscription',
        loadChildren: () => import('../subscriptions/routes/subscriptions.routes'),
        canActivate: [subscriptionAccessGuard]
    },
    {
        path: 'settings/organization',
        loadChildren: () => import('../organization/routes/organization.routes'),
        canActivate: [tenantManagementGuard]
    },
    { path: 'settings/clinics', loadChildren: () => import('../clinics/routes/clinics.routes') },
    { path: 'settings/reminders', loadChildren: () => import('../reminders/routes/reminders.routes') },
    {
        path: 'settings/members',
        loadChildren: () => import('../tenant-members/routes/tenant-members.routes'),
        canActivate: [tenantManagementGuard]
    },
    {
        path: 'settings/invites',
        loadChildren: () => import('../tenant-invites/routes/tenant-invites.routes'),
        canActivate: [tenantManagementGuard]
    },
    { path: 'treatments', loadChildren: () => import('../treatments/routes/treatments.routes') },
    { path: 'prescriptions', loadChildren: () => import('../prescriptions/routes/prescriptions.routes') },
    { path: 'lab-results', loadChildren: () => import('../lab-results/routes/lab-results.routes') },
    { path: 'hospitalizations', loadChildren: () => import('../hospitalizations/routes/hospitalizations.routes') }
] as Routes;
