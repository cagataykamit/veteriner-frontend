import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { EDocumentSettingsPageComponent } from '@/app/features/e-documents/pages/e-document-settings-page.component';
import { PANEL_FORBIDDEN_URL } from '@/app/core/auth/panel-forbidden';

const requireClinicUpdate: CanActivateFn = () =>
    inject(AuthService).hasOperationClaim(CLINICS_UPDATE_CLAIM) ? true : inject(Router).createUrlTree([PANEL_FORBIDDEN_URL]);

export default [{ path: '', canActivate: [requireClinicUpdate], component: EDocumentSettingsPageComponent }] as Routes;
