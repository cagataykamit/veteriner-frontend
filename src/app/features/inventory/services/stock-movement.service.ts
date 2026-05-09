import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import {
    mapPagedStockMovementsToVm,
    stockMovementsListQueryToHttpParams
} from '@/app/features/inventory/data/stock-movement.mapper';
import type { StockMovementDtoPagedResult } from '@/app/features/inventory/models/stock-movement-api.model';
import type { StockMovementsListQuery } from '@/app/features/inventory/models/stock-movement-query.model';
import type { StockMovementVm } from '@/app/features/inventory/models/stock-movement-vm.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

export interface StockMovementsPagedVm {
    items: StockMovementVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class StockMovementService {
    private readonly api = inject(ApiClient);

    list(query: StockMovementsListQuery): Observable<StockMovementsPagedVm> {
        const params = stockMovementsListQueryToHttpParams(query);
        return this.api.get<StockMovementDtoPagedResult>(ApiEndpoints.stockMovements.list(), params).pipe(
            map((res) => mapPagedStockMovementsToVm(res)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Stok hareketleri yüklenemedi.')))
            )
        );
    }

    /** Ürün içi liste — `productId` URL’de; `Search` gönderilmez (endpoint uyumu). */
    listByProductId(productId: string, query: StockMovementsListQuery): Observable<StockMovementsPagedVm> {
        const params = stockMovementsListQueryToHttpParams(query, { omitSearch: true });
        return this.api
            .get<StockMovementDtoPagedResult>(ApiEndpoints.products.stockMovements(productId), params)
            .pipe(
                map((res) => mapPagedStockMovementsToVm(res)),
                catchError((err: HttpErrorResponse) =>
                    throwError(() => new Error(messageFromHttpError(err, 'Stok hareketleri yüklenemedi.')))
                )
            );
    }
}
