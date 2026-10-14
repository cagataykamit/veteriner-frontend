import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import type { CreateGoodsReceiptRequest, GoodsReceiptResultDto } from '@/app/features/inventory/models/goods-receipt-api.model';
import type { GoodsReceiptResultVm } from '@/app/features/inventory/models/goods-receipt-form.model';
import { toGoodsReceiptSubmitError } from '@/app/features/inventory/utils/goods-receipt-error.utils';

@Injectable({ providedIn: 'root' })
export class GoodsReceiptService {
    private readonly api = inject(ApiClient);

    create(request: CreateGoodsReceiptRequest): Observable<GoodsReceiptResultVm> {
        return this.api.post<GoodsReceiptResultDto>(ApiEndpoints.goodsReceipts.create(), request).pipe(
            map((res) => ({ created: res?.created !== false, lineCount: res?.lines?.length ?? request.lines.length })),
            catchError((err: HttpErrorResponse) => throwError(() => toGoodsReceiptSubmitError(err)))
        );
    }
}
