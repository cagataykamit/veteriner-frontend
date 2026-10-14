/**
 * Backend — mal kabul (POST /goods-receipts). Kaynak: `docs/GOODS_RECEIPT_API_CONTRACT.md` §3.
 * Tarihler `yyyy-MM-dd`; satırlar en çok {@link GOODS_RECEIPT_MAX_LINES}.
 */

export const GOODS_RECEIPT_MAX_LINES = 100;

export interface CreateGoodsReceiptLineRequest {
    productId: string;
    quantity: number;
    lotNumber: string | null;
    expiryDate: string | null;
    unitCost: number | null;
    /** Yalnız geçmiş SKT'li satırda, satır başına (`StockBatches.ExpiredAcknowledgementRequired`). */
    acknowledgeExpired?: true;
}

export interface CreateGoodsReceiptRequest {
    clinicId: string;
    /** Form açılışında bir kez üretilir; Kaydet tekrarlarında aynı kalır. */
    requestId: string;
    supplierName: string | null;
    invoiceNumber: string | null;
    invoiceDate: string | null;
    receivedDate: string | null;
    dispatchedDate: string | null;
    transportMethod: string | null;
    coldChainMonitor: string | null;
    lines: CreateGoodsReceiptLineRequest[];
}

/** 201 (`created: true`) veya 200 (aynı `requestId` tekrarı, `created: false`); `lines` istek sırasındadır. */
export interface GoodsReceiptResultDto {
    created: boolean;
    clinicId: string;
    lines?: unknown[] | null;
}
