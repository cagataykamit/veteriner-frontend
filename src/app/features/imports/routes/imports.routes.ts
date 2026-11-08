import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { CUSTOM_DEVELOPMENT_REQUESTS_MANAGE_CLAIM, IMPORTS_COMMIT_CLAIM, IMPORTS_MANAGE_CLAIM, IMPORTS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';

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
        // Geçiş desteği talebi (TIER-021): ticari talep olduğundan özel geliştirme talebiyle aynı yetki (Admin, Owner).
        path: 'migration-support',
        title: 'Geçiş desteği',
        canActivate: [claimGuard(CUSTOM_DEVELOPMENT_REQUESTS_MANAGE_CLAIM)],
        loadComponent: () => import('../pages/migration-support-page.component').then((m) => m.MigrationSupportPageComponent)
    },
    {
        path: ':id/rollback',
        title: 'Geri al',
        canActivate: [claimGuard(IMPORTS_COMMIT_CLAIM)],
        loadComponent: () => import('../pages/import-rollback-page.component').then((m) => m.ImportRollbackPageComponent)
    },
    {
        path: ':id',
        title: 'Veri içe aktarma',
        canActivate: [claimGuard(IMPORTS_READ_CLAIM)],
        loadComponent: () => import('../pages/import-wizard-page.component').then((m) => m.ImportWizardPageComponent)
    }
] as Routes;
