import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import {
    mapPagedStockMovementsToVm,
    stockMovementsListQueryToHttpParams
} from '@/app/features/inventory/data/stock-movement.mapper';
import type {
    CreateStockMovementRequest,
    StockMovementDtoPagedResult
} from '@/app/features/inventory/models/stock-movement-api.model';
import type { StockMovementsListQuery } from '@/app/features/inventory/models/stock-movement-query.model';
import type { StockMovementVm } from '@/app/features/inventory/models/stock-movement-vm.model';
import { messageFromHttpError, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';

export interface StockMovementsPagedVm {
    items: StockMovementVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

const STOCK_MOVEMENT_CREATE_MESSAGES: Record<string, string> = {
    'StockMovements.InsufficientStock':
        'Yetersiz stok. Çıkış miktarı eldeki stoktan fazla olamaz.',
    'StockMovements.StockAlreadyInitialized':
        'Bu ürün için bu klinikte başlangıç stoğu daha önce oluşturulmuş.',
    'StockMovements.AdjustmentUnchanged': 'Stok miktarı zaten girilen değerle aynı.',
    'StockMovements.ConcurrencyConflict':
        'Stok bilgisi başka bir işlemle güncellendi. Lütfen listeyi yenileyip tekrar deneyin.',
    'StockMovements.ClinicContextMismatch': 'Seçili klinik ile aktif klinik bağlamı uyuşmuyor.',
    'Clinics.AccessDenied': 'Bu klinik için stok işlemi yapma yetkiniz yok.'
};

function stockMovementCreateUserMessage(err: HttpErrorResponse): string {
    const code = problemCodeFromHttpError(err);
    if (code && STOCK_MOVEMENT_CREATE_MESSAGES[code]) {
        return STOCK_MOVEMENT_CREATE_MESSAGES[code]!;
    }
    return messageFromHttpError(err, 'Stok hareketi kaydedilemedi.');
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

    create(request: CreateStockMovementRequest): Observable<void> {
        return this.api.post<unknown>(ApiEndpoints.stockMovements.create(), request).pipe(
            map(() => undefined),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(stockMovementCreateUserMessage(err)))
            )
        );
    }
}
