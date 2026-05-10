/**
 * Backend — ürün stoku (GET /products/{id}/stocks, PUT /product-stocks/{id}/minimum-stock-level).
 */

export interface ProductStockDto {
    id: string;
    productId?: string | null;
    productName?: string | null;
    productSku?: string | null;
    productCategoryId?: string | null;
    productCategoryName?: string | null;
    clinicId?: string | null;
    clinicName?: string | null;
    quantityOnHand?: number | string | null;
    minimumStockLevel?: number | string | null;
    isBelowMinimum?: boolean | null;
    updatedAtUtc?: string | null;
}

export interface UpdateProductStockMinimumStockLevelRequest {
    minimumStockLevel: number;
}

/** GET `/api/v1/product-stocks` — sayfalı liste sorgusu (backend ile uyumlu). */
export interface ProductStocksListQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    clinicId?: string;
    productId?: string;
    productCategoryId?: string;
    isBelowMinimum?: boolean;
}

export interface ProductStockDtoPagedResult {
    items?: ProductStockDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}
