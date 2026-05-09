import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { STOCK_MOVEMENTS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { StockMovementsPageComponent } from '@/app/features/inventory/pages/stock-movements-page/stock-movements-page.component';

export default [
    {
        path: '',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);
                return auth.hasOperationClaim(STOCK_MOVEMENTS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: StockMovementsPageComponent
    }
] as Routes;
