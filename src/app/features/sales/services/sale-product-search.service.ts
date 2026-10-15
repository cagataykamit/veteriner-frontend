import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { productsQueryToHttpParams } from '@/app/features/inventory/data/product.mapper';
import type { ProductDtoPagedResult } from '@/app/features/inventory/models/product-api.model';
import { isSellableProduct, mapProductDtoToSaleProductVm } from '@/app/features/sales/data/sale.mapper';
import type { SaleProductVm } from '@/app/features/sales/models/sale-vm.model';
import { toUserError } from '@/app/shared/utils/api-error.utils';

const SEARCH_PAGE_SIZE = 12;

/**
 * Satış ekranı ürün araması: ad, SKU veya barkod (sunucu `Search`), yalnız aktif ürünler.
 * Aşı ve kontrollü ürünler sonuçtan süzülür; sunucu yine de reddeder (`Sales.VaccineNotSellable` / `Sales.ControlledSubstanceNotSellable`).
 */
@Injectable({ providedIn: 'root' })
export class SaleProductSearchService {
    private readonly api = inject(ApiClient);

    search(term: string): Observable<SaleProductVm[]> {
        const params = productsQueryToHttpParams({ page: 1, pageSize: SEARCH_PAGE_SIZE, search: term, isActive: true });

        return this.api.get<ProductDtoPagedResult>(ApiEndpoints.products.list(), params).pipe(
            map((r) => (r.items ?? []).map(mapProductDtoToSaleProductVm).filter(isSellableProduct)),
            toUserError('Ürünler aranamadı.')
        );
    }
}
