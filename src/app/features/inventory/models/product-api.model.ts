/**
 * Backend — ürün DTO’ları (GET /products, GET /products/{id}).
 */

/** `docs/BATCH_STOCK_API_CONTRACT.md` §2 — string enum. */
export type ProductKindApi = 'Other' | 'Medicine' | 'Vaccine';
export type ProductControlledClassApi = 'None' | 'Narcotic' | 'Psychotropic';

/** Liste öğesi / detay — backend ile hizalı alan kümesi. */
export interface ProductDto {
    id: string;
    productCategoryId?: string | null;
    productCategoryName?: string | null;
    name?: string | null;
    sku?: string | null;
    barcode?: string | null;
    description?: string | null;
    unit?: string | null;
    unitPrice?: number | string | null;
    currency?: string | null;
    isActive?: boolean | null;
    kind?: ProductKindApi | null;
    controlledClass?: ProductControlledClassApi | null;
    pharmacologicalForm?: string | null;
    presentationForm?: string | null;
    packaging?: string | null;
}

export interface ProductDtoPagedResult {
    items?: ProductDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/** POST /products gövdesi — JSON camelCase. */
export interface CreateProductRequest {
    productCategoryId?: string | null;
    name: string;
    sku?: string | null;
    barcode?: string | null;
    description?: string | null;
    unit: string;
    unitPrice: number;
    currency: string;
    kind: ProductKindApi;
    controlledClass: ProductControlledClassApi;
    /** PUT'ta `null` dokunmaz, `""` temizler (`BATCH_STOCK_API_CONTRACT.md` §2). */
    pharmacologicalForm: string | null;
    presentationForm: string | null;
    packaging: string | null;
}

/**
 * PUT /products/{id} gövdesi.
 * Kimlik yol parametresinde; gövdede `id` beklenmediği varsayımıyla (backend command ile teyit).
 */
export type UpdateProductRequest = CreateProductRequest;

/** GET /product-categories satırı */
export interface ProductCategoryDto {
    id: string;
    name?: string | null;
    description?: string | null;
    isActive?: boolean | null;
}

export interface ProductCategoryDtoPagedResult {
    items?: ProductCategoryDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/** POST /product-categories */
export interface CreateProductCategoryRequest {
    name: string;
    description?: string | null;
}

/** PUT /product-categories/{id} — kimlik yol parametresinde. */
export type UpdateProductCategoryRequest = CreateProductCategoryRequest;
