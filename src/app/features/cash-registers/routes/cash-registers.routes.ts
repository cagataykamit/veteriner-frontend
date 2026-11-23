import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { CASH_REGISTERS_MANAGE_CLAIM, CASH_REGISTERS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { PANEL_FORBIDDEN_URL } from '@/app/core/auth/panel-forbidden';

function requireClaim(claim: string): CanActivateFn {
    return () => {
        const router = inject(Router);

        return inject(AuthService).hasOperationClaim(claim) ? true : router.createUrlTree([PANEL_FORBIDDEN_URL]);
    };
}

/** Para › Kasa sekmesi (S-05); izin eski Raporlar › Kasa sayfasıyla aynı. */
export const CASH_REGISTER_ROUTES: Routes = [
    {
        path: '',
        canActivate: [requireClaim(CASH_REGISTERS_READ_CLAIM)],
        loadComponent: () => import('@/app/features/cash-registers/pages/cash-register-page.component').then((m) => m.CashRegisterPageComponent)
    }
];

/** Ayarlar › Tanımlar › Kasalar ve gelir/gider türleri (S-05); kartla aynı izin. */
export const CASH_REGISTER_DEFINITION_ROUTES: Routes = [
    {
        path: '',
        canActivate: [requireClaim(CASH_REGISTERS_MANAGE_CLAIM)],
        loadComponent: () => import('@/app/features/cash-registers/pages/cash-register-definitions-page.component').then((m) => m.CashRegisterDefinitionsPageComponent)
    }
];