import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

export type StockBatchExpiryStatus = 'expired' | 'soon' | 'ok' | 'none';

export interface StockBatchVm {
    id: string;
    lotNumber: string;
    /** `yyyy-MM-dd`; SKT yoksa `null`. */
    expiryDate: string | null;
    expiryText: string;
    expiryStatus: StockBatchExpiryStatus;
    /** Rozet metni; SKT sorunu yoksa boş. */
    expiryBadgeLabel: string;
    expiryBadgeSeverity: StatusTagSeverity;
    isExpired: boolean;
    initialQuantity: number;
    remainingQuantity: number;
    remainingText: string;
    unit: string;
    supplierName: string;
    invoiceText: string;
    receivedText: string;
}

export interface ProductStockBatchesVm {
    productId: string;
    clinicId: string;
    unit: string;
    quantityOnHand: number;
    quantityOnHandText: string;
    availableText: string;
    expiredQuantity: number;
    expiredText: string;
    batchedQuantityText: string;
    unbatchedQuantity: number;
    unbatchedQuantityText: string;
    batches: StockBatchVm[];
}
