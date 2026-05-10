import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import {
    mapPagedProductCategoriesToVm,
    mapProductCategoryDtoToListVm,
    type ProductCategoriesPagedVm
} from '@/app/features/inventory/data/product-category.mapper';
import { productCategoriesQueryToHttpParams } from '@/app/features/inventory/data/product.mapper';
import type {
    CreateProductCategoryRequest,
    ProductCategoryDto,
    ProductCategoryDtoPagedResult,
    UpdateProductCategoryRequest
} from '@/app/features/inventory/models/product-api.model';
import type { ProductCategoriesListQuery } from '@/app/features/inventory/models/product-query.model';
import type { ProductCategoryListItemVm } from '@/app/features/inventory/models/product-vm.model';
import { messageFromHttpError, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';

const PRODUCT_CATEGORY_PROBLEM_MESSAGES: Record<string, string> = {
    'ProductCategories.NameAlreadyExists': 'Bu kategori adı zaten kullanılıyor.',
    ProductCategoriesNameAlreadyExists: 'Bu kategori adı zaten kullanılıyor.',
    'ProductCategories.RouteIdMismatch':
        'Kategori bilgileri uyuşmuyor. Sayfayı yenileyip tekrar deneyin.',
    ProductCategoriesRouteIdMismatch:
        'Kategori bilgileri uyuşmuyor. Sayfayı yenileyip tekrar deneyin.',
    'ProductCategories.NotFound': 'Kategori bulunamadı.',
    ProductCategoriesNotFound: 'Kategori bulunamadı.'
};

function productCategoryMutationMessage(err: HttpErrorResponse, fallback: string): string {
    const code = problemCodeFromHttpError(err);
    if (code) {
        const mapped =
            PRODUCT_CATEGORY_PROBLEM_MESSAGES[code] ??
            PRODUCT_CATEGORY_PROBLEM_MESSAGES[code.replace(/\./g, '')] ??
            null;
        if (mapped) {
            return mapped;
        }
    }
    return messageFromHttpError(err, fallback);
}

@Injectable({ providedIn: 'root' })
export class ProductCategoryService {
    private readonly api = inject(ApiClient);

    list(query: ProductCategoriesListQuery): Observable<ProductCategoriesPagedVm> {
        const params = productCategoriesQueryToHttpParams(query);
        return this.api.get<ProductCategoryDtoPagedResult>(ApiEndpoints.productCategories.list(), params).pipe(
            map((res) => mapPagedProductCategoriesToVm(res)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(messageFromHttpError(err, 'Kategori listesi yüklenemedi.')))
            )
        );
    }

    getById(id: string): Observable<ProductCategoryListItemVm> {
        return this.api.get<ProductCategoryDto>(ApiEndpoints.productCategories.byId(id)).pipe(
            map((dto) => mapProductCategoryDtoToListVm(dto)),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(productCategoryMutationMessage(err, 'Kategori bulunamadı veya yüklenemedi.')))
            )
        );
    }

    /** Düzenleme dialog’u için ham DTO (form doldurma). */
    getDtoById(id: string): Observable<ProductCategoryDto> {
        return this.api.get<ProductCategoryDto>(ApiEndpoints.productCategories.byId(id)).pipe(
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(productCategoryMutationMessage(err, 'Kategori bulunamadı veya yüklenemedi.')))
            )
        );
    }

    create(body: CreateProductCategoryRequest): Observable<void> {
        return this.api.post<unknown>(ApiEndpoints.productCategories.create(), body).pipe(
            map(() => undefined),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(productCategoryMutationMessage(err, 'Kategori oluşturulamadı.')))
            )
        );
    }

    update(id: string, body: UpdateProductCategoryRequest): Observable<void> {
        return this.api.put<unknown>(ApiEndpoints.productCategories.update(id), body).pipe(
            map(() => undefined),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(productCategoryMutationMessage(err, 'Kategori güncellenemedi.')))
            )
        );
    }

    activate(id: string): Observable<void> {
        return this.api.post<unknown>(ApiEndpoints.productCategories.activate(id), {}).pipe(
            map(() => undefined),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(productCategoryMutationMessage(err, 'Kategori aktifleştirilemedi.')))
            )
        );
    }

    deactivate(id: string): Observable<void> {
        return this.api.post<unknown>(ApiEndpoints.productCategories.deactivate(id), {}).pipe(
            map(() => undefined),
            catchError((err: HttpErrorResponse) =>
                throwError(() => new Error(productCategoryMutationMessage(err, 'Kategori pasifleştirilemedi.')))
            )
        );
    }
}
