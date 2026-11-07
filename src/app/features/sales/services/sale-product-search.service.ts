import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { productsQueryToHttpParams } from '@/app/entities/inventory/data/product.mapper';
import type { ProductDtoPagedResult } from '@/app/entities/inventory/models/product-api.model';
import type { ProductsListQuery } from '@/app/entities/inventory/models/product-query.model';
import { isSellableProduct, mapProductDtoToSaleProductVm } from '@/app/features/sales/data/sale.mapper';
import type { SaleProductVm } from '@/app/features/sales/models/sale-vm.model';
import { SALE_PANEL_PROBLEM_MESSAGES } from '@/app/features/sales/utils/sale-error.utils';
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
        return this.list({ page: 1, pageSize: SEARCH_PAGE_SIZE, search: term, isActive: true });
    }

    /** Kamerayla okunan barkod (TIER-006): tam eşleşen satılabilir ürün; barkod kiracıda tektir. */
    findByBarcode(barcode: string): Observable<SaleProductVm | null> {
        return this.list({ page: 1, pageSize: 1, barcode, isActive: true }).pipe(map((r) => r[0] ?? null));
    }

    private list(query: ProductsListQuery): Observable<SaleProductVm[]> {
        return this.api.get<ProductDtoPagedResult>(ApiEndpoints.products.list(), productsQueryToHttpParams(query)).pipe(
            map((r) => (r.items ?? []).map(mapProductDtoToSaleProductVm).filter(isSellableProduct)),
            toUserError('Ürünler aranamadı.', SALE_PANEL_PROBLEM_MESSAGES)
        );
    }
}
