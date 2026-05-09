import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { PRODUCTS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ProductDetailPageComponent } from '@/app/features/inventory/pages/product-detail-page/product-detail-page.component';
import { ProductListPageComponent } from '@/app/features/inventory/pages/product-list-page/product-list-page.component';

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
        component: ProductListPageComponent
    },
    {
        path: ':id',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);
                return auth.hasOperationClaim(PRODUCTS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: ProductDetailPageComponent
    }
] as Routes;
