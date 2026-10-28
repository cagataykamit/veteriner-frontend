import { Routes } from '@angular/router';
import { platformAdminGuard } from '@/app/core/auth/platform-admin.guard';

/** Platform yöneticisi: çift ödemeler ve iadeleri; klinik rolleri bulunamadı sayfasına gider. */
export default [
    {
        path: '',
        canActivate: [platformAdminGuard],
        loadComponent: () => import('../pages/duplicate-payments-page.component').then((m) => m.DuplicatePaymentsPageComponent)
    }
] as Routes;
