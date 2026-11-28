import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_READ_CLAIM, CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { PANEL_FORBIDDEN_URL } from '@/app/core/auth/panel-forbidden';
import { AiSettingsPageComponent } from '@/app/features/ai-settings/pages/ai-settings-page.component';

/** Klinik yapay zekâ ayarı (`AI_HISTORY_SUMMARY_API_CONTRACT.md` §3a): okuma `Clinics.Read`, aç/kapa sayfa içinde `Clinics.Update`. */
export default [
    {
        path: '',
        title: 'Yapay zekâ',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);

                return [CLINICS_READ_CLAIM, CLINICS_UPDATE_CLAIM].some((c) => auth.hasOperationClaim(c)) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
            }
        ],
        component: AiSettingsPageComponent
    }
] as Routes;
