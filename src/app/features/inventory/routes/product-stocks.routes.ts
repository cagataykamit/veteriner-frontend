import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { PRODUCTS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ProductStocksPageComponent } from '@/app/features/inventory/pages/product-stocks-page/product-stocks-page.component';

export default [
    {
        path: '',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);
                return auth.hasOperationClaim(PRODUCTS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: ProductStocksPageComponent
    }
] as Routes;
