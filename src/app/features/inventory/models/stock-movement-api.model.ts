/**
 * Backend — stok hareketi DTO’ları (GET /stock-movements, GET /products/{id}/stock-movements).
 */

export interface StockMovementDto {
    id: string;
    productId?: string | null;
    productName?: string | null;
    productSku?: string | null;
    productCategoryId?: string | null;
    productCategoryName?: string | null;
    clinicId?: string | null;
    clinicName?: string | null;
    movementType?: string | number | null;
    quantity?: number | string | null;
    unitCost?: number | string | null;
    reason?: string | null;
    referenceType?: string | null;
    referenceId?: string | null;
    occurredAtUtc?: string | null;
    createdByUserId?: string | null;
    notes?: string | null;
    createdAtUtc?: string | null;
}

export interface StockMovementDtoPagedResult {
    items?: StockMovementDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/**
 * C# `StockMovementType` — JsonStringEnumConverter yok; gövde numeric beklenir.
 * Initial=0, In=1, Out=2, Adjustment=3
 */
export type StockMovementTypeApiValue = 0 | 1 | 2 | 3;

/** POST `/api/v1/stock-movements` — alan adları backend ile birebir. */
export interface CreateStockMovementRequest {
    clinicId: string;
    productId: string;
    movementType: StockMovementTypeApiValue;
    quantity: number;
    unitCost: number | null;
    reason: string | null;
    referenceType: string | null;
    referenceId: string | null;
    occurredAtUtc: string | null;
    notes: string | null;
}
