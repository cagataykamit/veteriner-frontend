import { Routes } from '@angular/router';
import { platformAdminGuard } from '@/app/core/auth/platform-admin.guard';

/** Platform yöneticisi: yapay zekâ kredi, fon ve maliyet (AI-007/008); klinik rolleri bulunamadı sayfasına gider. */
export default [
    {
        path: '',
        canActivate: [platformAdminGuard],
        loadComponent: () => import('../pages/ai-admin-page.component').then((m) => m.AiAdminPageComponent)
    }
] as Routes;
