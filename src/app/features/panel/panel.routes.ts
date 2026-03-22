import { Routes } from '@angular/router';

export default [
    { path: 'dashboard', loadChildren: () => import('../dashboard/dashboard.routes') },
    { path: 'clients', loadChildren: () => import('../clients/routes/clients.routes') },
    { path: 'pets', loadChildren: () => import('../pets/routes/pets.routes') },
    { path: 'appointments', loadChildren: () => import('../appointments/appointments.routes') },
    { path: 'examinations', loadChildren: () => import('../examinations/examinations.routes') },
    { path: 'vaccinations', loadChildren: () => import('../vaccinations/vaccinations.routes') },
    { path: 'payments', loadChildren: () => import('../payments/payments.routes') }
] as Routes;
