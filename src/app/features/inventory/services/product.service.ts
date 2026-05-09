import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import {
    mapPagedProductsToVm,
    mapProductDtoToDetailVm,
    productsQueryToHttpParams
} from '@/app/features/inventory/data/product.mapper';
import type { ProductDto, ProductDtoPagedResult } from '@/app/features/inventory/models/product-api.model';
import type { ProductsListQuery } from '@/app/features/inventory/models/product-query.model';
import type { ProductDetailVm, ProductListItemVm } from '@/app/features/inventory/models/product-vm.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

export interface ProductsPagedVm {
    items: ProductListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
    private readonly api = inject(ApiClient);

    getProducts(query: ProductsListQuery): Observable<ProductsPagedVm> {
        const params = productsQueryToHttpParams(query);
        return this.api.get<ProductDtoPagedResult>(ApiEndpoints.products.list(), params).pipe(
            map((res) => mapPagedProductsToVm(res)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Ürün listesi yüklenemedi.')))
            )
        );
    }

    getById(id: string): Observable<ProductDetailVm> {
        return this.api.get<ProductDto>(ApiEndpoints.products.byId(id)).pipe(
            map((dto) => mapProductDtoToDetailVm(dto)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Ürün bulunamadı veya yüklenemedi.')))
            )
        );
    }
}
