import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { STOCK_MOVEMENTS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { GoodsReceiptPageComponent } from '@/app/features/inventory/pages/goods-receipt-page/goods-receipt-page.component';

export default [
    {
        path: '',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);
                return auth.hasOperationClaim(STOCK_MOVEMENTS_CREATE_CLAIM) ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: GoodsReceiptPageComponent
    }
] as Routes;
