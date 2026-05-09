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
