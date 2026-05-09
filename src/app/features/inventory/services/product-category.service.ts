import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { productCategoriesQueryToHttpParams } from '@/app/features/inventory/data/product.mapper';
import type { ProductCategoryDtoPagedResult } from '@/app/features/inventory/models/product-api.model';
import type { ProductCategoriesListQuery } from '@/app/features/inventory/models/product-query.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class ProductCategoryService {
    private readonly api = inject(ApiClient);

    list(query: ProductCategoriesListQuery): Observable<ProductCategoryDtoPagedResult> {
        const params = productCategoriesQueryToHttpParams(query);
        return this.api.get<ProductCategoryDtoPagedResult>(ApiEndpoints.productCategories.list(), params).pipe(
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Kategori listesi yüklenemedi.')))
            )
        );
    }
}
