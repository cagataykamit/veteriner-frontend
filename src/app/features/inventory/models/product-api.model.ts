/**
 * Backend — ürün DTO’ları (GET /products, GET /products/{id}).
 */

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
}

export interface ProductDtoPagedResult {
    items?: ProductDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}
