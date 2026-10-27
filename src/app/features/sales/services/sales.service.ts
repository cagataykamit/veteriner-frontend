import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import {
    mapCreateSaleResponseToVm,
    mapPagedSalesToVm,
    mapSaleDtoToDetailVm,
    salesQueryToHttpParams
} from '@/app/features/sales/data/sale.mapper';
import type {
    CreateSaleRequest,
    CreateSaleResponseDto,
    SaleDto,
    SaleDtoPagedResult,
    SalesListQuery,
    VoidSaleRequest
} from '@/app/features/sales/models/sale-api.model';
import type { CreateSaleResultVm, SaleDetailVm, SalesPagedVm } from '@/app/features/sales/models/sale-vm.model';
import { SALE_PANEL_PROBLEM_MESSAGES } from '@/app/features/sales/utils/sale-error.utils';
import { toUserError } from '@/app/shared/utils/api-error.utils';

/** Doğrudan satış uçları (`docs/DIRECT_SALE_API_CONTRACT.md` §3). */
@Injectable({ providedIn: 'root' })
export class SalesService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    getSales(query: SalesListQuery): Observable<SalesPagedVm> {
        const merged: SalesListQuery = { ...query, clinicId: query.clinicId?.trim() || this.auth.getClinicId()?.trim() || undefined };

        return this.api
            .get<SaleDtoPagedResult>(ApiEndpoints.sales.list(), salesQueryToHttpParams(merged))
            .pipe(map(mapPagedSalesToVm), toUserError('Satış listesi yüklenemedi.', SALE_PANEL_PROBLEM_MESSAGES));
    }

    getSaleById(id: string): Observable<SaleDetailVm> {
        return this.api.get<SaleDto>(ApiEndpoints.sales.byId(id)).pipe(map(mapSaleDtoToDetailVm), toUserError('Satış bulunamadı veya yüklenemedi.', SALE_PANEL_PROBLEM_MESSAGES));
    }

    /** `requestId` sepet başına bir kez üretilir; aynı kimlikle tekrar gönderim `200 created:false` döner ve başarıdır. */
    createSale(request: CreateSaleRequest): Observable<CreateSaleResultVm> {
        return this.api.post<CreateSaleResponseDto>(ApiEndpoints.sales.list(), request).pipe(map(mapCreateSaleResponseToVm), toUserError('Satış kaydedilemedi.', SALE_PANEL_PROBLEM_MESSAGES));
    }

    /** `Sales.Correct`; yalnız tam iptal. Hata mesajları (ör. `Charges.VoidBlockedByAllocation`) `messageFromHttpError` ile eşlenir. */
    voidSale(id: string, request: VoidSaleRequest): Observable<SaleDetailVm> {
        const body: VoidSaleRequest = { reason: request.reason.trim(), stockOutcome: request.stockOutcome };

        return this.api.post<SaleDto>(ApiEndpoints.sales.void(id), body).pipe(map(mapSaleDtoToDetailVm), toUserError('Satış iptal edilemedi.', SALE_PANEL_PROBLEM_MESSAGES));
    }
}
