import { Routes } from '@angular/router';
import { subscriptionAccessGuard } from '@/app/core/auth/subscription-access.guard';
import { tenantManagementGuard } from '@/app/core/auth/tenant-management.guard';

export default [
    { path: 'dashboard', loadChildren: () => import('../dashboard/dashboard.routes') },
    { path: 'today', loadChildren: () => import('../visits/routes/visits.routes') },
    { path: 'patients', loadChildren: () => import('../patients/routes/patients.routes') },
    { path: 'clients', loadChildren: () => import('../clients/routes/clients.routes') },
    { path: 'pets', loadChildren: () => import('../pets/routes/pets.routes') },
    // Tür, ırk ve kategori Ayarlar > Tanımlar altına taşındı; eski adresler alt yollarıyla yönlenir.
    { path: 'species', redirectTo: 'settings/definitions/species' },
    { path: 'breeds', redirectTo: 'settings/definitions/breeds' },
    { path: 'product-categories', redirectTo: 'settings/definitions/product-categories' },
    { path: 'appointments', loadChildren: () => import('../appointments/routes/appointments.routes') },
    { path: 'examinations', loadChildren: () => import('../examinations/routes/examinations.routes') },
    { path: 'vaccinations', loadChildren: () => import('../vaccinations/routes/vaccinations.routes') },
    { path: 'payments', loadChildren: () => import('../payments/routes/payments.routes') },
    { path: 'sales', loadChildren: () => import('../sales/routes/sales.routes') },
    { path: 'charges', loadChildren: () => import('../charges/routes/charges.routes') },
    { path: 'e-documents', loadChildren: () => import('../e-documents/routes/e-documents.routes') },
    { path: 'administrations', loadChildren: () => import('../administrations/routes/administrations.routes') },
    { path: 'products', loadChildren: () => import('../inventory/routes/inventory.routes') },
    { path: 'stocks', loadChildren: () => import('../inventory/routes/product-stocks.routes') },
    { path: 'stock-movements', loadChildren: () => import('../inventory/routes/stock-movements.routes') },
    { path: 'goods-receipts', loadChildren: () => import('../inventory/routes/goods-receipts.routes') },
    { path: 'reports', loadChildren: () => import('../reports/reports.routes') },
    { path: 'sales-partners', loadChildren: () => import('../sales-partners/routes/sales-partners.routes') },
    { path: 'trial-metrics', loadChildren: () => import('../trial-metrics/routes/trial-metrics.routes') },
    { path: 'duplicate-payments', loadChildren: () => import('../duplicate-payments/routes/duplicate-payments.routes') },
    { path: 'clinic-addresses', loadChildren: () => import('../clinic-addresses/routes/clinic-addresses.routes') },
    { path: 'custom-development-requests', loadChildren: () => import('../custom-development-admin/routes/custom-development-admin.routes') },
    {
        path: 'settings',
        pathMatch: 'full',
        loadComponent: () => import('../settings/pages/settings-home-page.component').then((m) => m.SettingsHomePageComponent)
    },
    { path: 'settings/definitions', loadChildren: () => import('../settings/routes/definitions.routes') },
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
    { path: 'settings/imports', loadChildren: () => import('../imports/routes/imports.routes') },
    { path: 'settings/clinics', loadChildren: () => import('../clinics/routes/clinics.routes') },
    { path: 'settings/kvkk-form', loadChildren: () => import('../kvkk/routes/kvkk-form-template.routes') },
    { path: 'settings/online-booking', loadChildren: () => import('../online-booking/routes/online-booking.routes') },
    { path: 'settings/vet-finder', loadChildren: () => import('../vet-finder/routes/vet-finder.routes') },
    { path: 'settings/owner-portal', loadChildren: () => import('../clinic-portal/routes/clinic-portal.routes') },
    { path: 'settings/api-access', loadChildren: () => import('../api-access/routes/api-access.routes') },
    { path: 'settings/data-export', loadChildren: () => import('../data-export/routes/data-export.routes') },
    { path: 'settings/custom-development', loadChildren: () => import('../custom-development/routes/custom-development.routes') },
    { path: 'notifications', loadChildren: () => import('../notifications/routes/notifications.routes') },
    { path: 'portal-inbox', loadChildren: () => import('../portal-inbox/routes/portal-inbox.routes') },
    { path: 'settings/reminders', loadChildren: () => import('../reminders/routes/reminders.routes') },
    { path: 'settings/account', loadChildren: () => import('../account/routes/account.routes') },
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
    { path: 'imaging', loadChildren: () => import('../imaging/routes/imaging.routes') },
    { path: 'hospitalizations', loadChildren: () => import('../hospitalizations/routes/hospitalizations.routes') },
    { path: '**', title: 'Sayfa bulunamadı', loadComponent: () => import('./pages/panel-notfound.component').then((m) => m.PanelNotfoundComponent) }
] as Routes;
