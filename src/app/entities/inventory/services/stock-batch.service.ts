import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { mapProductStockBatchesDtoToVm } from '@/app/entities/inventory/data/stock-batch.mapper';
import type { ProductStockBatchesDto } from '@/app/entities/inventory/models/stock-batch-api.model';
import type { ProductStockBatchesVm } from '@/app/entities/inventory/models/stock-batch-vm.model';
import { toUserError } from '@/app/shared/utils/api-error.utils';

/** Parti okuma uçları (`StockMovements.Read`; `docs/BATCH_STOCK_API_CONTRACT.md` §7). */
@Injectable({ providedIn: 'root' })
export class StockBatchService {
    private readonly api = inject(ApiClient);

    /** Kalanı sıfırdan büyük partiler FEFO sıralı + partisiz (devir) bakiye. */
    getByProduct(productId: string, clinicId: string): Observable<ProductStockBatchesVm> {
        const params = new HttpParams().set('clinicId', clinicId);

        return this.api
            .get<ProductStockBatchesDto>(ApiEndpoints.products.stockBatches(productId), params)
            .pipe(map(mapProductStockBatchesDtoToVm), toUserError('Parti bilgileri yüklenemedi.'));
    }
}
