import { HttpParams } from '@angular/common/http';
import type {
    CreateProductRequest,
    ProductCategoryDto,
    ProductDto,
    ProductDtoPagedResult,
    UpdateProductRequest
} from '@/app/features/inventory/models/product-api.model';
import type { ProductCategoriesListQuery, ProductsListQuery } from '@/app/features/inventory/models/product-query.model';
import type { ProductUpsertFormValue } from '@/app/features/inventory/models/product-upsert-form.model';
import type { ProductDetailVm, ProductListItemVm } from '@/app/features/inventory/models/product-vm.model';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatMoney } from '@/app/shared/utils/money.utils';

const EM = '—';

function str(v: string | null | undefined): string {
    return v?.trim() ? v.trim() : EM;
}

function num(v: number | string | null | undefined): number | null {
    if (v == null || Number.isNaN(Number(v))) {
        return null;
    }
    return Number(v);
}

function productActiveSeverity(isActive: boolean): StatusTagSeverity {
    return isActive ? 'success' : 'secondary';
}

function productActiveLabel(isActive: boolean): string {
    return isActive ? 'Aktif' : 'Pasif';
}

export function currencyCode(dto: ProductDto): string {
    const c = dto.currency?.trim();
    return c || 'TRY';
}

function optionalTrimmedOrNull(v: string | null | undefined): string | null {
    const t = v?.trim() ?? '';
    return t ? t : null;
}

/** Boş veya yalnızca boşluk → null (SKU / barkod / açıklama / kategori). */
export function mapProductUpsertFormValueToCreateRequest(value: ProductUpsertFormValue): CreateProductRequest {
    const unitPrice = value.unitPrice;
    if (unitPrice == null || Number.isNaN(unitPrice)) {
        throw new Error('PRODUCT_UPSERT_UNIT_PRICE_REQUIRED');
    }
    const currency = (value.currency?.trim() || 'TRY').trim();
    return {
        productCategoryId: optionalTrimmedOrNull(value.productCategoryId),
        name: value.name.trim(),
        sku: optionalTrimmedOrNull(value.sku),
        barcode: optionalTrimmedOrNull(value.barcode),
        description: optionalTrimmedOrNull(value.description),
        unit: value.unit.trim(),
        unitPrice,
        currency
    };
}

export function mapProductUpsertFormValueToUpdateRequest(value: ProductUpsertFormValue): UpdateProductRequest {
    return mapProductUpsertFormValueToCreateRequest(value);
}

export function mapProductDtoToUpsertFormValue(dto: ProductDto): ProductUpsertFormValue {
    const price = num(dto.unitPrice);
    return {
        name: dto.name?.trim() ?? '',
        productCategoryId: dto.productCategoryId?.trim() ?? '',
        sku: dto.sku?.trim() ?? '',
        barcode: dto.barcode?.trim() ?? '',
        unit: dto.unit?.trim() ?? '',
        unitPrice: price,
        currency: currencyCode(dto),
        description: dto.description?.trim() ?? ''
    };
}

export function mapProductCategoryDtoToSelectOption(dto: ProductCategoryDto): SelectOption {
    const label = dto.name?.trim() ? dto.name.trim() : '—';
    return { label, value: dto.id };
}

export function productCategoriesQueryToHttpParams(query: ProductCategoriesListQuery): HttpParams {
    let p = new HttpParams();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    p = p.set('Page', String(page));
    p = p.set('PageSize', String(pageSize));
    if (query.search?.trim()) {
        p = p.set('Search', query.search.trim());
    }
    if (query.isActive === true) {
        p = p.set('IsActive', 'true');
    } else if (query.isActive === false) {
        p = p.set('IsActive', 'false');
    }
    return p;
}

export function mapProductDtoToListVm(dto: ProductDto): ProductListItemVm {
    const isActive = dto.isActive === true;
    const currency = currencyCode(dto);
    const unitPrice = num(dto.unitPrice);
    return {
        id: dto.id,
        name: str(dto.name),
        sku: str(dto.sku),
        categoryName: str(dto.productCategoryName),
        unit: str(dto.unit),
        unitPriceText: formatMoney(unitPrice, currency),
        currency,
        isActive,
        statusLabel: productActiveLabel(isActive),
        statusSeverity: productActiveSeverity(isActive)
    };
}

export function mapProductDtoToDetailVm(dto: ProductDto): ProductDetailVm {
    const isActive = dto.isActive === true;
    const currency = currencyCode(dto);
    const unitPrice = num(dto.unitPrice);
    const desc = dto.description?.trim() ?? '';
    return {
        id: dto.id,
        name: str(dto.name),
        sku: str(dto.sku),
        barcode: str(dto.barcode),
        description: desc || EM,
        categoryName: str(dto.productCategoryName),
        unit: str(dto.unit),
        unitPriceText: formatMoney(unitPrice, currency),
        currency,
        isActive,
        statusLabel: productActiveLabel(isActive),
        statusSeverity: productActiveSeverity(isActive)
    };
}

export function mapPagedProductsToVm(raw: ProductDtoPagedResult): {
    items: ProductListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
} {
    const items = (raw.items ?? []).map((row) => mapProductDtoToListVm(row));
    return {
        items,
        page: raw.page,
        pageSize: raw.pageSize,
        totalItems: raw.totalItems,
        totalPages: raw.totalPages
    };
}

export function productsQueryToHttpParams(query: ProductsListQuery, opts?: { omitPaging?: boolean }): HttpParams {
    let p = new HttpParams();
    if (!opts?.omitPaging) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 10;
        p = p.set('Page', String(page));
        p = p.set('PageSize', String(pageSize));
    }
    if (query.search?.trim()) {
        p = p.set('Search', query.search.trim());
    }
    if (query.productCategoryId?.trim()) {
        p = p.set('ProductCategoryId', query.productCategoryId.trim());
    }
    if (query.isActive === true) {
        p = p.set('IsActive', 'true');
    } else if (query.isActive === false) {
        p = p.set('IsActive', 'false');
    }
    return p;
}
