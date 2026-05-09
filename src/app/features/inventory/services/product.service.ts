import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import {
    mapPagedProductsToVm,
    mapProductDtoToDetailVm,
    mapProductUpsertFormValueToCreateRequest,
    mapProductUpsertFormValueToUpdateRequest,
    productsQueryToHttpParams
} from '@/app/features/inventory/data/product.mapper';
import {
    mapMinimumStockLevelValueToRequest,
    mapProductStockDtoToVm
} from '@/app/features/inventory/data/product-stock.mapper';
import type {
    CreateProductRequest,
    ProductDto,
    ProductDtoPagedResult,
    UpdateProductRequest
} from '@/app/features/inventory/models/product-api.model';
import type { ProductStockDto } from '@/app/features/inventory/models/product-stock-api.model';
import type { ProductStockVm } from '@/app/features/inventory/models/product-stock-vm.model';
import type { ProductUpsertFormValue } from '@/app/features/inventory/models/product-upsert-form.model';
import type { ProductsListQuery } from '@/app/features/inventory/models/product-query.model';
import type { ProductDetailVm, ProductListItemVm } from '@/app/features/inventory/models/product-vm.model';
import { messageFromHttpError, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';

const PRODUCT_STOCK_CONCURRENCY_MESSAGE =
    'Stok bilgisi başka bir işlemle güncellendi. Lütfen yenileyip tekrar deneyin.';

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

    /** Düzenleme formu için ham DTO (birim fiyat sayısal). */
    getDtoById(id: string): Observable<ProductDto> {
        return this.api.get<ProductDto>(ApiEndpoints.products.byId(id)).pipe(
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Ürün bulunamadı veya yüklenemedi.')))
            )
        );
    }

    createFromFormValue(value: ProductUpsertFormValue): Observable<string | null> {
        let body: CreateProductRequest;
        try {
            body = mapProductUpsertFormValueToCreateRequest(value);
        } catch {
            return throwError(() => new Error('Geçerli birim fiyatı girin.'));
        }
        return this.api.post<unknown>(ApiEndpoints.products.create(), body).pipe(
            map((raw) => extractCreatedProductIdFromPostResponse(raw)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Ürün oluşturulamadı.')))
            )
        );
    }

    updateFromFormValue(id: string, value: ProductUpsertFormValue): Observable<void> {
        let body: UpdateProductRequest;
        try {
            body = mapProductUpsertFormValueToUpdateRequest(value);
        } catch {
            return throwError(() => new Error('Geçerli birim fiyatı girin.'));
        }
        return this.api.put<unknown>(ApiEndpoints.products.update(id), body).pipe(
            map(() => void 0),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Ürün güncellenemedi.')))
            )
        );
    }

    activate(id: string): Observable<void> {
        return this.api.post<unknown>(ApiEndpoints.products.activate(id), {}).pipe(
            map(() => void 0),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Ürün aktifleştirilemedi.')))
            )
        );
    }

    deactivate(id: string): Observable<void> {
        return this.api.post<unknown>(ApiEndpoints.products.deactivate(id), {}).pipe(
            map(() => void 0),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Ürün pasifleştirilemedi.')))
            )
        );
    }

    getStocksByProductId(productId: string): Observable<ProductStockVm[]> {
        return this.api.get<ProductStockDto[]>(ApiEndpoints.products.stocks(productId)).pipe(
            map((raw) => {
                const list = Array.isArray(raw) ? raw : [];
                return list.map((dto) => mapProductStockDtoToVm(dto));
            }),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Stok bilgileri yüklenemedi.')))
            )
        );
    }

    updateProductStockMinimumLevel(stockId: string, minimumStockLevel: number): Observable<void> {
        const body = mapMinimumStockLevelValueToRequest(minimumStockLevel);
        return this.api.put<unknown>(ApiEndpoints.productStocks.updateMinimumStockLevel(stockId), body).pipe(
            map(() => void 0),
            catchError((err: HttpErrorResponse) => {
                if (err.status === 409) {
                    const code = problemCodeFromHttpError(err);
                    const normalized = code?.replace(/\./g, '') ?? '';
                    if (
                        code === 'ProductStocks.ConcurrencyConflict' ||
                        normalized === 'ProductStocksConcurrencyConflict'
                    ) {
                        return throwError(() => new Error(PRODUCT_STOCK_CONCURRENCY_MESSAGE));
                    }
                }
                return throwError(() => new Error(messageFromHttpError(err, 'Minimum stok güncellenemedi.')));
            })
        );
    }
}

function extractCreatedProductIdFromPostResponse(body: unknown): string | null {
    if (body == null) {
        return null;
    }
    if (typeof body === 'string') {
        return body.trim() || null;
    }
    if (typeof body !== 'object') {
        return null;
    }
    const o = body as Record<string, unknown>;
    const idKeys = ['id', 'Id', 'productId', 'ProductId'];
    for (const k of idKeys) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
        if (typeof v === 'number' && !Number.isNaN(v)) {
            return String(v);
        }
    }
    const wrappers = ['data', 'Data', 'value', 'Value', 'result', 'Result', 'product', 'Product'];
    for (const w of wrappers) {
        const inner = o[w];
        if (inner && typeof inner === 'object') {
            const n = inner as Record<string, unknown>;
            for (const k of idKeys) {
                const v = n[k];
                if (typeof v === 'string' && v.trim()) {
                    return v.trim();
                }
                if (typeof v === 'number' && !Number.isNaN(v)) {
                    return String(v);
                }
            }
        }
    }
    return null;
}
