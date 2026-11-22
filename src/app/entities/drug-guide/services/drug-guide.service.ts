import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { AuthService } from '@/app/core/auth/auth.service';
import type { ActiveIngredientVm, DrugGuideSummaryVm, IngredientStockProductVm, LicensedProductsPageVm, LicensedProductsQuery, LicensedProductVm, ProductDrugInfoVm } from '@/app/entities/drug-guide/models/drug-guide.model';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

/** Sözleşme DTO'ları görünüm modeliyle aynı biçimde; yalnız boş alanlar `null`a indirilir. */
function normalizeProduct(p: LicensedProductVm): LicensedProductVm {
    return {
        ...p,
        activeIngredients: p.activeIngredients ?? [],
        targetSpecies: p.targetSpecies ?? [],
        licenseNumber: p.licenseNumber?.trim() || null,
        spcUrl: p.spcUrl?.trim() || null
    };
}

function fail(fallback: string) {
    return (err: HttpErrorResponse) => throwError(() => new Error(messageFromHttpError(err, fallback)));
}

@Injectable({ providedIn: 'root' })
export class DrugGuideService {
    private readonly api = inject(ApiClient);
    private readonly auth = inject(AuthService);

    getSummary(): Observable<DrugGuideSummaryVm> {
        return this.api.get<DrugGuideSummaryVm>(ApiEndpoints.drugGuide.summary()).pipe(catchError(fail('İlaç rehberi yüklenemedi.')));
    }

    searchProducts(query: LicensedProductsQuery): Observable<LicensedProductsPageVm> {
        let params = new HttpParams().set('Page', String(query.page ?? 1)).set('PageSize', String(query.pageSize ?? 20));

        if (query.search?.trim()) {
            params = params.set('Search', query.search.trim());
        }

        if (query.field && query.field !== 'All') {
            params = params.set('field', query.field);
        }

        if (query.activeIngredientId) {
            params = params.set('activeIngredientId', query.activeIngredientId);
        }

        return this.api.get<LicensedProductsPageVm>(ApiEndpoints.drugGuide.products(), params).pipe(
            map((page) => ({ ...page, items: (page.items ?? []).map(normalizeProduct) })),
            catchError(fail('Rehber araması yapılamadı.'))
        );
    }

    getProduct(id: string): Observable<LicensedProductVm> {
        return this.api.get<LicensedProductVm>(ApiEndpoints.drugGuide.productById(id)).pipe(map(normalizeProduct), catchError(fail('Rehber kaydı yüklenemedi.')));
    }

    searchIngredients(search: string, limit = 20): Observable<ActiveIngredientVm[]> {
        const params = new HttpParams().set('search', search.trim()).set('limit', String(limit));

        return this.api.get<ActiveIngredientVm[]>(ApiEndpoints.drugGuide.ingredients(), params).pipe(catchError(fail('Etken madde araması yapılamadı.')));
    }

    /** Etken maddeyi içeren, rehbere bağlı klinik ürünleri ve aktif klinikteki stok (`Products.Read`). */
    getIngredientStockProducts(activeIngredientId: string): Observable<IngredientStockProductVm[]> {
        const clinicId = this.auth.getClinicId()?.trim();
        const params = clinicId ? new HttpParams().set('clinicId', clinicId) : undefined;

        return this.api.get<IngredientStockProductVm[]>(ApiEndpoints.drugGuide.ingredientStockProducts(activeIngredientId), params).pipe(catchError(fail('Stoktaki ürünler yüklenemedi.')));
    }

    /** Reçete/uygulama satırı: bağlı ürünlerin etken maddesi ve hastanın türüne göre engellemeyen not. */
    getProductInfo(productIds: string[], petId: string | null): Observable<ProductDrugInfoVm[]> {
        let params = new HttpParams();

        for (const id of productIds) {
            params = params.append('productIds', id);
        }

        if (petId) {
            params = params.set('petId', petId);
        }

        return this.api.get<ProductDrugInfoVm[]>(ApiEndpoints.drugGuide.productInfo(), params).pipe(catchError(fail('Rehber bilgisi yüklenemedi.')));
    }

    /** Ürün kartı bağı (`Products.Update`); `null` bağı kaldırır. */
    linkProduct(productId: string, licensedProductId: string | null): Observable<void> {
        return this.api.put<void>(ApiEndpoints.products.licensedProduct(productId), { licensedProductId }).pipe(catchError(fail('Rehber bağı kaydedilemedi.')));
    }
}
