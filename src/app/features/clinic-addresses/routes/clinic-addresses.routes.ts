import { Routes } from '@angular/router';
import { platformAdminGuard } from '@/app/core/auth/platform-admin.guard';

/** Platform yöneticisi: klinik sitesine ek adres değiştirme hakkı; klinik rolleri bulunamadı sayfasına gider. */
export default [
    {
        path: '',
        title: 'Klinik adresleri',
        canActivate: [platformAdminGuard],
        loadComponent: () => import('../pages/clinic-addresses-page.component').then((m) => m.ClinicAddressesPageComponent)
    }
] as Routes;
