import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import {
    mapPagedProductStocksToVm,
    productStocksQueryToHttpParams,
    type ProductStocksPagedVm
} from '@/app/features/inventory/data/product-stock.mapper';
import type { ProductStockDtoPagedResult, ProductStocksListQuery } from '@/app/features/inventory/models/product-stock-api.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class ProductStockService {
    private readonly api = inject(ApiClient);

    list(query: ProductStocksListQuery): Observable<ProductStocksPagedVm> {
        const params = productStocksQueryToHttpParams(query);
        return this.api.get<ProductStockDtoPagedResult>(ApiEndpoints.productStocks.list(), params).pipe(
            map((raw) => mapPagedProductStocksToVm(raw)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Stok listesi yüklenemedi.')))
            )
        );
    }
}
