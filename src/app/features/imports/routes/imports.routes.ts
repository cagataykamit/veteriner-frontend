import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { IMPORTS_MANAGE_CLAIM, IMPORTS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';

const claimGuard =
    (claim: string): CanActivateFn =>
    () => (inject(AuthService).hasOperationClaim(claim) ? true : inject(Router).createUrlTree(['/notfound']));

export default [
    {
        path: '',
        pathMatch: 'full',
        title: 'Veri içe aktarma',
        canActivate: [claimGuard(IMPORTS_READ_CLAIM)],
        loadComponent: () => import('../pages/imports-list-page.component').then((m) => m.ImportsListPageComponent)
    },
    {
        path: 'new',
        title: 'Yeni içe aktarma',
        canActivate: [claimGuard(IMPORTS_MANAGE_CLAIM)],
        loadComponent: () => import('../pages/import-upload-page.component').then((m) => m.ImportUploadPageComponent)
    },
    {
        path: ':id',
        title: 'Veri içe aktarma',
        canActivate: [claimGuard(IMPORTS_READ_CLAIM)],
        loadComponent: () => import('../pages/import-wizard-page.component').then((m) => m.ImportWizardPageComponent)
    }
] as Routes;
