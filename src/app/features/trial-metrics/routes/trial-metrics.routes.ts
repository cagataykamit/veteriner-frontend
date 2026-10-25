import { Routes } from '@angular/router';
import { platformAdminGuard } from '@/app/core/auth/platform-admin.guard';

/** Platform yöneticisi: deneme aktivasyon ölçümleri (TRIAL-008); klinik rolleri bulunamadı sayfasına gider. */
export default [
    {
        path: '',
        canActivate: [platformAdminGuard],
        loadComponent: () => import('../pages/trial-metrics-page.component').then((m) => m.TrialMetricsPageComponent)
    }
] as Routes;
