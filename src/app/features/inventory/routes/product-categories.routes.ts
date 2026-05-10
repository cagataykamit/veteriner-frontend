import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { PRODUCT_CATEGORIES_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ProductCategoriesPageComponent } from '@/app/features/inventory/pages/product-categories-page/product-categories-page.component';

export default [
    {
        path: '',
        canActivate: [
            () => {
                const auth = inject(AuthService);
                const router = inject(Router);
                return auth.hasOperationClaim(PRODUCT_CATEGORIES_READ_CLAIM)
                    ? true
                    : router.createUrlTree(['/notfound']);
            }
        ],
        component: ProductCategoriesPageComponent
    }
] as Routes;
