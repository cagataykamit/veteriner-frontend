/**
 * Backend — parti (lot) DTO'ları. Kaynak: `docs/BATCH_STOCK_API_CONTRACT.md` §4 ve §7.
 */

/** Stok girişinde gönderilen parti bloğu (§4). Tarihler `yyyy-MM-dd`. */
export interface StockMovementBatchRequest {
    lotNumber: string | null;
    expiryDate: string | null;
    supplierName: string | null;
    invoiceNumber: string | null;
    invoiceDate: string | null;
    receivedDate: string | null;
    dispatchedDate: string | null;
    transportMethod: string | null;
    coldChainMonitor: string | null;
}

export interface StockBatchDto {
    id: string;
    clinicId: string;
    productId: string;
    productName?: string | null;
    productSku?: string | null;
    unit?: string | null;
    lotNumber?: string | null;
    expiryDate?: string | null;
    initialQuantity: number | string;
    remainingQuantity: number | string;
    supplierName?: string | null;
    invoiceNumber?: string | null;
    invoiceDate?: string | null;
    receivedDate?: string | null;
    dispatchedDate?: string | null;
    transportMethod?: string | null;
    coldChainMonitor?: string | null;
    isExpired?: boolean | null;
    createdAtUtc?: string | null;
}

/** GET `/products/{id}/stock-batches?clinicId=` (§7). */
export interface ProductStockBatchesDto {
    productId: string;
    clinicId: string;
    unit?: string | null;
    quantityOnHand: number | string;
    batchedQuantity: number | string;
    unbatchedQuantity: number | string;
    batches?: StockBatchDto[] | null;
}
