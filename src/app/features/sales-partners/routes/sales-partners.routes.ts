import { Routes } from '@angular/router';
import { platformAdminGuard } from '@/app/core/auth/platform-admin.guard';

/** Platform yöneticisi: satış ortakları (ADR-037); klinik rolleri bulunamadı sayfasına gider. */
export default [
    {
        path: '',
        canActivate: [platformAdminGuard],
        loadComponent: () => import('../pages/sales-partners-list-page.component').then((m) => m.SalesPartnersListPageComponent)
    },
    {
        path: ':id',
        canActivate: [platformAdminGuard],
        loadComponent: () => import('../pages/sales-partner-detail-page.component').then((m) => m.SalesPartnerDetailPageComponent)
    }
] as Routes;
