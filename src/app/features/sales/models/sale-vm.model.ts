import type { SaleStockOutcomeApi } from '@/app/features/sales/models/sale-api.model';
import type { ProductControlledClassApi, ProductKindApi } from '@/app/features/inventory/models/product-api.model';
import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

export interface SaleLineVm {
    id: string;
    productId: string;
    productName: string;
    unit: string;
    quantity: number;
    quantityText: string;
    unitPriceText: string;
    lineAmountText: string;
    /** Parti seçilmişse seri no / SKT; partisiz bakiyede boş. */
    batchText: string;
}

export interface SaleListItemVm {
    id: string;
    clientId: string;
    clientName: string;
    isWalkIn: boolean;
    isVoided: boolean;
    statusLabel: string;
    statusSeverity: StatusTagSeverity;
    soldAtUtc: string;
    totalText: string;
    paidText: string;
    outstandingText: string;
    hasOutstanding: boolean;
    /** Liste satırında özet: ilk iki ürün adı ve kalan sayı. */
    productsSummary: string;
}

export interface SaleDetailVm extends SaleListItemVm {
    currency: string;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    notes: string;
    lines: SaleLineVm[];
    voidReason: string;
    voidedAtUtc: string | null;
    voidStockOutcome: SaleStockOutcomeApi | null;
    voidStockOutcomeLabel: string;
}

export interface SalesPagedVm {
    items: SaleListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/** Satıştan sonra gelen güncel stok; yalnız minimumun altına inenler gösterilir. */
export interface SaleStockAlertVm {
    productId: string;
    quantityText: string;
    isBelowMinimum: boolean;
}

export interface CreateSaleResultVm {
    /** `false`: aynı `requestId` ile tekrar gönderim; ilk satış döndü. */
    created: boolean;
    sale: SaleDetailVm;
    stocks: SaleStockAlertVm[];
}

/** Satış ekranında aranan ürün: sayısal fiyat ve satılabilirlik sınıflaması. */
export interface SaleProductVm {
    id: string;
    name: string;
    sku: string;
    barcode: string;
    unit: string;
    unitPrice: number;
    currency: string;
    kind: ProductKindApi;
    controlledClass: ProductControlledClassApi;
}
