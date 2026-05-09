import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    PRODUCTS_CREATE_CLAIM,
    PRODUCTS_READ_CLAIM,
    PRODUCTS_UPDATE_CLAIM,
    STOCK_MOVEMENTS_READ_CLAIM
} from '@/app/core/auth/operation-claims.constants';
import { ProductCreatePageComponent } from '@/app/features/inventory/pages/product-create-page/product-create-page.component';
import { ProductDetailPageComponent } from '@/app/features/inventory/pages/product-detail-page/product-detail-page.component';
import { ProductEditPageComponent } from '@/app/features/inventory/pages/product-edit-page/product-edit-page.component';
import { ProductListPageComponent } from '@/app/features/inventory/pages/product-list-page/product-list-page.component';
import { ProductStockMovementsPageComponent } from '@/app/features/inventory/pages/product-stock-movements-page/product-stock-movements-page.component';

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
        path: 'new',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);
                return auth.hasOperationClaim(PRODUCTS_CREATE_CLAIM) ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: ProductCreatePageComponent
    },
    {
        path: ':id/edit',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);
                return auth.hasOperationClaim(PRODUCTS_UPDATE_CLAIM) ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: ProductEditPageComponent
    },
    {
        path: ':id/stock-movements',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);
                return auth.hasOperationClaim(STOCK_MOVEMENTS_READ_CLAIM) ? true : router.createUrlTree(['/notfound']);
            }
        ],
        component: ProductStockMovementsPageComponent
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
