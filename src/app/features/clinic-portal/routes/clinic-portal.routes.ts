import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_READ_CLAIM, CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ClinicPortalSettingsPageComponent } from '@/app/features/clinic-portal/pages/clinic-portal-settings-page.component';

/** Klinik portal ayarı (`PORTAL_API_CONTRACT.md` §12): okuma `Clinics.Read`, yazma sayfa içinde `Clinics.Update`. */
export default [
    {
        path: '',
        title: 'Hasta sahibi portalı',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return [CLINICS_READ_CLAIM, CLINICS_UPDATE_CLAIM].some((c) => auth.hasOperationClaim(c)) ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: ClinicPortalSettingsPageComponent
    }
] as Routes;
