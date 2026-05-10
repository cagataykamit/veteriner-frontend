import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

export interface ProductStockVm {
    id: string;
    /** Global stok listesinden gelir; tek ürün stoklarında DTO dolu olabilir. */
    productId: string;
    productName: string;
    productSkuText: string;
    productCategoryName: string;
    clinicId: string;
    clinicName: string;
    quantityOnHand: number;
    quantityText: string;
    minimumStockLevel: number;
    minimumStockLevelText: string;
    isBelowMinimum: boolean;
    statusLabel: string;
    statusSeverity: StatusTagSeverity;
    updatedAtText: string;
}
