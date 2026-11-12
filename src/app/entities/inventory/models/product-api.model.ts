/**
 * Backend — ürün DTO’ları (GET /products, GET /products/{id}).
 */

/** `docs/BATCH_STOCK_API_CONTRACT.md` §2 — string enum; `Service` (hizmet kataloğu, stok takipsiz) `CHARGE_SUGGESTION_API_CONTRACT.md` §7. */
export type ProductKindApi = 'Other' | 'Medicine' | 'Vaccine' | 'Service';
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
    /** Üretici firma (RECORD-005); tedarikçiden ayrıdır. */
    manufacturer?: string | null;
    /** KDV oranı (%); `null` = klinik varsayılanı (`BATCH_STOCK_API_CONTRACT.md` §2.1). */
    vatRate?: number | string | null;
    /** Birim alış fiyatı (TL), bilgi amaçlı: stok değeri ve ücret hesabı okumaz. */
    purchasePrice?: number | string | null;
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
    manufacturer: string | null;
    /** `null` = klinik varsayılanı (POST); PUT'ta `null` dokunmaz, temizlemek için `clearVatRate`. */
    vatRate: number | null;
    /** PUT'ta `null` dokunmaz, temizlemek için `clearPurchasePrice`. */
    purchasePrice: number | null;
}

/**
 * PUT /products/{id} gövdesi.
 * Kimlik yol parametresinde; gövdede `id` beklenmediği varsayımıyla (backend command ile teyit).
 * `clear…: true` ilgili değeri temizler; değerle birlikte gönderilirse `Products.Validation` (§2.1).
 */
export type UpdateProductRequest = CreateProductRequest & {
    clearVatRate: boolean;
    clearPurchasePrice: boolean;
};

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
