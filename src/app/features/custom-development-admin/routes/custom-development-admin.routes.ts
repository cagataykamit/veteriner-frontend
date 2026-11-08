import { Routes } from '@angular/router';
import { platformAdminGuard } from '@/app/core/auth/platform-admin.guard';

/** Platform yöneticisi: tüm kiracıların size özel geliştirme talepleri (TIER-010); klinik rolleri bulunamadı sayfasına gider. */
export default [
    {
        path: '',
        title: 'Özel geliştirme talepleri',
        canActivate: [platformAdminGuard],
        loadComponent: () => import('../pages/custom-development-admin-page.component').then((m) => m.CustomDevelopmentAdminPageComponent)
    }
] as Routes;
