import { Routes } from '@angular/router';

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
    { path: 'settings/subscription', loadChildren: () => import('../subscriptions/routes/subscriptions.routes') },
    { path: 'treatments', loadChildren: () => import('../treatments/routes/treatments.routes') },
    { path: 'prescriptions', loadChildren: () => import('../prescriptions/routes/prescriptions.routes') },
    { path: 'lab-results', loadChildren: () => import('../lab-results/routes/lab-results.routes') },
    { path: 'hospitalizations', loadChildren: () => import('../hospitalizations/routes/hospitalizations.routes') }
] as Routes;
