import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { SALES_CREATE_CLAIM, SALES_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { SaleDetailPageComponent } from '@/app/features/sales/pages/sale-detail-page/sale-detail-page.component';
import { SaleNewPageComponent } from '@/app/features/sales/pages/sale-new-page/sale-new-page.component';
import { SalesListPageComponent } from '@/app/features/sales/pages/sales-list-page/sales-list-page.component';

function requireClaim(claim: string): CanActivateFn {
    return () => {
        const router = inject(Router);

        return inject(AuthService).hasOperationClaim(claim) ? true : router.createUrlTree(['/notfound']);
    };
}

export default [
    { path: '', canActivate: [requireClaim(SALES_READ_CLAIM)], component: SalesListPageComponent },
    { path: 'new', canActivate: [requireClaim(SALES_CREATE_CLAIM)], component: SaleNewPageComponent },
    { path: ':id', canActivate: [requireClaim(SALES_READ_CLAIM)], component: SaleDetailPageComponent }
] as Routes;
