/**
 * Backend — doğrudan satış DTO'ları. Kaynak: `docs/DIRECT_SALE_API_CONTRACT.md` §3 ve §4.
 */

export type SaleStatusApi = 'Active' | 'Voided';
export type SaleStockOutcomeApi = 'StockReturned' | 'WrittenOff';
export type SalePaymentMethodApi = 'Cash' | 'Card' | 'Transfer';

export interface SaleLineDto {
    id: string;
    productId: string;
    productName?: string | null;
    unit?: string | null;
    quantity: number | string;
    unitPrice: number | string;
    lineAmount: number | string;
    batchId?: string | null;
    lotNumber?: string | null;
    expiryDate?: string | null;
}

export interface SaleDto {
    id: string;
    clinicId: string;
    clientId: string;
    clientName?: string | null;
    isWalkIn?: boolean | null;
    status: SaleStatusApi;
    soldAtUtc: string;
    totalAmount: number | string;
    currency?: string | null;
    notes?: string | null;
    chargeId?: string | null;
    paymentId?: string | null;
    paidAmount: number | string;
    outstandingAmount: number | string;
    createdByUserId?: string | null;
    createdAtUtc?: string | null;
    requestId?: string | null;
    voidedAtUtc?: string | null;
    voidedByUserId?: string | null;
    voidReason?: string | null;
    voidStockOutcome?: SaleStockOutcomeApi | null;
    lines?: SaleLineDto[] | null;
}

export interface SaleDtoPagedResult {
    items?: SaleDto[] | null;
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/** Satıştaki ürünün güncel stok bilgisi; düşük stok yalnız bildirilir. */
export interface SaleStockDto {
    productId: string;
    quantityOnHand: number | string;
    minimumStockLevel?: number | string | null;
    isBelowMinimum?: boolean | null;
    availableQuantity?: number | string | null;
    expiredQuantity?: number | string | null;
}

/** 201 yeni satış, 200 aynı `requestId` ile tekrar (`created: false`, ilk satış). */
export interface CreateSaleResponseDto {
    created: boolean;
    sale: SaleDto;
    stocks?: SaleStockDto[] | null;
}

export interface CreateSaleLineRequest {
    productId: string;
    quantity: number;
    unitPrice: number;
    batchId?: string;
}

export interface CreateSalePaymentRequest {
    method: SalePaymentMethodApi;
    amount: number;
}

export interface CreateSaleRequest {
    clinicId?: string;
    /** Boş = Peşin müşteri. */
    clientId?: string;
    requestId: string;
    notes?: string;
    lines: CreateSaleLineRequest[];
    payment?: CreateSalePaymentRequest;
}

export interface VoidSaleRequest {
    reason: string;
    stockOutcome: SaleStockOutcomeApi;
}

export interface SalesListQuery {
    page?: number;
    pageSize?: number;
    clinicId?: string;
    clientId?: string;
    productId?: string;
    fromUtc?: string;
    toUtc?: string;
    includeVoided?: boolean;
}
